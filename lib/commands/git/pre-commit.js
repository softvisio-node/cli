const Command = require( "../../command" );

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Git pre-commit hook.",
        };
    }

    async run () {
        const fs = require( "fs" ),
            utils = require( "../../utils" ),
            File = require( "../../src/file" );

        if ( !this._isRootPackageDir( "." ) ) process.exit();

        const git = this._findRootPackage( "." ).git;

        // get list of staged files
        let staged = await git.run( "diff", "--cached", "--name-only", "--diff-filter=ACMR" );
        if ( !staged.ok ) this._throwError( `Unable to get list of staged files.` );
        if ( !staged.data ) process.exit();
        staged = staged.data.split( "\n" ).filter( file => file !== "" );

        staged = utils.getFiles( staged, { "cwd": ".", "useIncludePatterns": true } )[1];

        // nothing to do
        if ( !staged.length ) process.exit();

        // get list of modified files
        let modified = await git.run( "diff", "--name-only", "--diff-filter=ACM" );
        if ( !modified.ok ) this._throwError( `Unable to get list of modified files.` );
        modified = Object.fromEntries( modified.data
            .split( "\n" )
            .filter( file => file !== "" )
            .map( file => [file, true] ) );

        let maxPathLength = 0;

        const files = {},
            report = {
                "total": 0,
                "ignored": 0,
                "processed": 0,
                "modified": 0,
                "ok": 0,
                "warnings": 0,
                "errors": 0,
            };

        for ( const filePath of staged ) {
            report.total++;

            // get staged file content
            const content = await git.run( "show", ":" + filePath );

            const file = new File( filePath, { "data": content.data } );

            // skip unsupported files
            if ( !file.type ) {
                report.ignored++;

                continue;
            }

            if ( filePath.length > maxPathLength ) maxPathLength = filePath.length;

            files[filePath] = file;
        }

        let status = 200;

        for ( const fileName in files ) {
            const res = await files[fileName].run( "lint" );

            // file was ignored
            if ( res.status === 202 ) continue;

            report.processed++;

            if ( res.status > status ) status = res.status;

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
                const res1 = await git.run( "update-index", "--add", "--cacheinfo", "100644", hash.data, fileName );
                if ( !res1.ok ) this._throwError( `Unable to update git index.` );

                // update working tree, if file wasn't modified after add and wasn't removed
                if ( !modified[fileName] && fs.existsSync( fileName ) ) fs.writeFileSync( fileName, res.data );
            }

            // report
            utils.reportFile( fileName, res, maxPathLength );
        }

        utils.lintReport( report );

        if ( status >= 300 ) {
            console.log( `Linter reported errors in staged files. Commit terminated.` );

            process.exit( 1 );
        }
        else {
            process.exit();
        }
    }
};
