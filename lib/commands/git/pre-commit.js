import Command from "#lib/command";

export default class extends Command {
    static cli () {
        return {
            "title": "git pre-commit hook",
        };
    }

    async run () {
        const { "default": fs } = await import( "fs" ),
            utils = await import( "#lib/utils" ),
            { "default": File } = await import( "#lib/src/file" );

        if ( !this._isRootPackageDir( "." ) ) process.exit();

        const git = this._findRootPackage( "." ).git;

        // get list of staged files
        let staged = await git.run( "diff", "--cached", "--name-only", "--diff-filter=ACMR" );
        if ( !staged.ok ) this._throwError( `Unable to get list of staged files.` );
        if ( !staged.data ) process.exit();
        staged = staged.data.split( "\n" ).filter( file => file !== "" );

        staged = utils.getFiles( staged, { "cwd": ".", "useLintIgnore": true } )[1];

        // nothing to do
        if ( !staged.length ) process.exit();

        // get list of modified files
        let modified = await git.run( "diff", "--name-only", "--diff-filter=ACM" );
        if ( !modified.ok ) this._throwError( `Unable to get list of modified files.` );
        modified = Object.fromEntries( modified.data
            .split( "\n" )
            .filter( file => file !== "" )
            .map( file => [file, true] ) );

        const report = {
                "total": 0,
                "ignored": 0,
                "processed": 0,
                "modified": 0,
                "ok": 0,
                "warnings": 0,
                "errors": 0,
            },
            table = utils.getLintReportTable( { "ansi": true } );

        let status = 200;

        for ( const filename of staged ) {

            // get staged file content
            const content = await git.run( "show", ":" + filename );

            let res;

            // XXX skip LFS files
            // need to use `git show :path | git lfs smudge` to extract file content
            if ( content.data.match( /^version https:\/\/git-lfs\.github\.com\/spec\/v1\noid .+?\nsize \d+$/m ) ) {
                res = result( 202 );
            }
            else {
                const file = new File( filename, { "data": content.data } );

                res = await file.run( "lint" );
            }

            if ( res.status > status ) status = res.status;

            report.total++;

            // file was ignored
            if ( res.status === 202 ) {
                report.ignored++;

                continue;
            }

            report.processed++;

            if ( res.status !== 202 ) {
                if ( res.status === 200 ) report.ok++;
                else if ( res.ok ) report.warnings++;
                else report.errors++;
            }

            // file was modified
            if ( res.isModified ) {
                report.modified++;

                // create git object
                const hash = await git.createObject( res.data );
                if ( !hash.ok || !hash.data ) this._throwError( `Unable to create git object.` );

                // update git staging index
                const res1 = await git.run( "update-index", "--add", "--cacheinfo", "100644", hash.data, filename );
                if ( !res1.ok ) this._throwError( `Unable to update git index.` );

                // update working tree, if file wasn't modified after add and wasn't removed
                if ( !modified[filename] && fs.existsSync( filename ) ) fs.writeFileSync( filename, res.data );
            }

            // report
            table.add( { "modified": res, "status": res, "path": filename } );
        }

        table.end();

        utils.printLintReport( report );

        console.log( "" );

        if ( status >= 300 ) {
            console.log( `Linter reported errors in staged files. Commit terminated.` );

            this._exitOnError();
        }
        else {
            process.exit();
        }
    }
}
