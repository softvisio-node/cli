import Command from "#lib/command";
import File from "#core/file";
import fs from "fs";
import * as utils from "#lib/utils";
import LintFile from "#lib/lint/file";
import glob from "#core/glob";

export default class extends Command {
    static cli () {
        return {};
    }

    async run () {
        if ( !this._isRootPackageDir( "." ) ) return;

        const git = this._findRootPackage( "." ).git;

        // get list of staged files
        let staged = await git.run( "diff", "--cached", "--name-only", "--diff-filter=ACMR" );
        if ( !staged.ok ) this._throwError( `Unable to get list of staged files` );

        // nothing to commit
        if ( !staged.data ) return;

        staged = staged.data.split( "\n" ).filter( file => file !== "" );

        staged = glob( staged, {
            "ignoreFile": ".lintignore",
        } );

        // nothing to do
        if ( !staged.length ) return;

        // get list of modified files
        let modified = await git.run( "diff", "--name-only", "--diff-filter=ACM" );
        if ( !modified.ok ) this._throwError( `Unable to get list of modified files` );
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
            let res;

            // detect file type
            const isSupported = LintFile.isTypeSupported( filename );

            // file type is not supported
            if ( isSupported === false ) {
                res = result( 202 );
            }
            else {

                // get staged file content
                const content = await git.run( "show", ":" + filename );

                // skip large files, >200Kb
                // https://stackoverflow.com/questions/23429499/stdout-buffer-issue-using-node-child-process
                if ( !content.ok && content.statusText === "stdout maxBuffer length exceeded" ) {
                    res = result( 202 );
                }

                // XXX skip LFS files
                // need to use `git show :path | git lfs smudge` to extract file content
                else if ( content.data.match( /^version https:\/\/git-lfs\.github\.com\/spec\/v1\noid .+?\nsize \d+$/m ) ) {
                    res = result( 202 );
                }

                // lint file
                else {
                    const file = new LintFile( new File( { "path": filename, "buffer": content.data } ) );

                    res = await file.run( "lint" );
                }
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
            if ( res.meta.isModified ) {
                report.modified++;

                // create git object
                const hash = await git.createObject( res.data );
                if ( !hash.ok || !hash.data ) this._throwError( `Unable to create git object` );

                // update git staging index
                const res1 = await git.run( "update-index", "--add", "--cacheinfo", "100644", hash.data, filename );
                if ( !res1.ok ) this._throwError( `Unable to update git index` );

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
    }
}
