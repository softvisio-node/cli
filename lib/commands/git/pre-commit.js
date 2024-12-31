import fs from "node:fs";
import File from "#core/file";
import { exists } from "#core/fs";
import glob from "#core/glob";
import Command from "#lib/command";
import Git from "#lib/git";
import { lintFile } from "#lib/lint";
import Package from "#lib/package";
import * as utils from "#lib/utils";

export default class extends Command {

    // static
    static cli () {
        return {};
    }

    // public
    async run () {
        const git = Git.new();

        // get list of staged files
        let staged = await git.run( "diff", "--cached", "--name-only", "--diff-filter=ACMR" );
        if ( !staged.ok ) return result( [ 500, `Unable to get list of staged files` ] );

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
        if ( !modified.ok ) return result( [ 500, `Unable to get list of modified files` ] );
        modified = Object.fromEntries( modified.data
            .split( "\n" )
            .filter( file => file !== "" )
            .map( file => [ file, true ] ) );

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

        const cache = {};

        for ( const filename of staged ) {
            let res;

            // get staged file content
            const content = await git.run( "show", ":" + filename );

            // skip large files, >200Kb
            // https://stackoverflow.com/questions/23429499/stdout-buffer-issue-using-node-child-process
            if ( !content.ok && content.statusText === "stdout maxBuffer length exceeded" ) {
                res = result( 201 );
            }

            // XXX skip LFS files
            // need to use `git show :path | git lfs smudge` to extract file content
            else if ( /^version https:\/\/git-lfs\.github\.com\/spec\/v1\noid .+?\nsize \d+$/m.test( content.data ) ) {
                res = result( 201 );
            }

            // lint file
            else {
                res = await lintFile(
                    new File( {
                        "path": filename,
                        "buffer": content.data,
                    } ),
                    {
                        "cwd": process.cwd(),
                        cache,
                    }
                );
            }

            if ( res.status > status ) status = res.status;

            report.total++;

            // file was ignored
            if ( res.status === 201 ) {
                report.ignored++;

                continue;
            }

            report.processed++;

            if ( res.status !== 201 ) {
                if ( res.status === 200 ) {
                    report.ok++;
                }
                else if ( res.ok ) {
                    report.warnings++;
                }
                else {
                    report.errors++;
                }
            }

            // file was modified
            if ( res.meta.isModified ) {
                report.modified++;

                // create git object
                const hash = await git.createObject( res.data );
                if ( !hash.ok || !hash.data ) return result( [ 500, `Unable to create git object` ] );

                // update git staging index
                const res1 = await git.run( "update-index", "--add", "--cacheinfo", "100644", hash.data, filename );
                if ( !res1.ok ) return result( [ 500, `Unable to update git index` ] );

                // update working tree, if file wasn't modified after add and wasn't removed
                if ( !modified[ filename ] && ( await exists( filename ) ) ) fs.writeFileSync( filename, res.data );
            }

            // report
            table.add( { "modified": res, "status": res, "path": filename } );
        }

        table.end();

        utils.printLintReport( report );

        console.log( "" );

        if ( status >= 300 ) {
            return result( [ 500, `Linter reported errors in staged files. Commit terminated.` ] );
        }

        // chmod
        const rootPackage = new Package( process.cwd() );
        if ( rootPackage.isPackage ) {
            for ( const pkg of [ rootPackage, ...rootPackage.subPackages ] ) {
                const res = await pkg.updateFilesMode();

                if ( !res.ok ) return res;
            }
        }
    }
}
