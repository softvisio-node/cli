import path from "node:path";
import lintFile from "#lib/lint/file";
import * as utils from "./utils.js";
import File from "#core/file";
import glob from "#core/glob";

export class LintPatterns {
    #cwd;
    #patterns;
    #useLintIgnore;
    #verbose;
    #reportIgnored;
    #useDefaults;
    #fix;
    #log;

    constructor ( patterns, { cwd, verbose, reportIgnored, useLintIgnore, useDefaults, fix = true, log = true } = {} ) {
        this.#patterns = Array.isArray( patterns ) ? patterns : [ patterns ];
        this.#cwd = cwd;
        this.#useLintIgnore = useLintIgnore;
        this.#verbose = verbose;
        this.#reportIgnored = reportIgnored;
        this.#useDefaults = !!useDefaults;
        this.#fix = !!fix;
        this.#log = !!log;
    }

    // public
    async run ( action ) {
        const cwd = path.resolve( this.#cwd || "." ).replaceAll( "\\", "/" );

        const files = glob( this.#patterns, {
            cwd,
            "ignoreFile": this.#useLintIgnore ? ".lintignore" : false,
        } );

        if ( !files.length ) return result( 200 );

        const report = {
                "total": 0,
                "ignored": 0,
                "processed": 0,
                "modified": 0,
                "ok": 0,
                "warnings": 0,
                "errors": 0,
            },
            table = utils.getLintReportTable();

        let status = 200;

        const cache = {};

        for ( const _path of files.sort( ( a, b ) => path.dirname( a ).toLowerCase().localeCompare( path.dirname( b ).toLowerCase() ) || path.basename( a ).toLowerCase().localeCompare( path.basename( b ).toLowerCase() ) ) ) {
            const res = await lintFile(
                new File( {
                    "path": path.join( cwd, _path ),
                } ),
                {
                    action,
                    "write": true,
                    "useDefaults": this.#useDefaults,
                    "fix": this.#fix,
                    "log": this.#log,
                    cache,
                }
            );

            if ( res.status > status ) status = res.status;

            report.total++;

            if ( res.status === 202 ) {
                report.ignored++;
            }
            else {
                report.processed++;

                if ( res.status === 200 ) {
                    report.ok++;
                }
                else if ( res.ok ) {
                    report.warnings++;
                }
                else {
                    report.errors++;
                }

                if ( res.meta.isModified ) report.modified++;
            }

            if ( !this.#verbose ) {
                if ( res.ok && !res.meta.isModified ) continue;
            }

            // skip ignored files
            else if ( !this.#reportIgnored && res.status === 202 ) continue;

            table.add( { "modified": res, "status": res, "path": _path } );
        }

        table.end();

        utils.printLintReport( report );

        return result( status );
    }
}

export { lintFile };

export async function lintPatterns ( patterns, { action, ...options } = {} ) {
    const lintPatterns = new LintPatterns( patterns, options );

    return lintPatterns.run( action );
}
