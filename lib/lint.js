import _path from "path";
import LintFile from "#lib/lint/file";
import * as utils from "./utils.js";
import File from "#core/file";
import glob from "#core/glob";

export default class Lint {
    #cwd;
    #patterns;
    #useLintIgnore;
    #verbose;
    #reportIgnored;

    constructor ( patterns, options = {} ) {
        this.#cwd = options.cwd;

        this.#patterns = Array.isArray( patterns ) ? patterns : [patterns];

        this.#useLintIgnore = options.useLintIgnore;

        this.#verbose = options.verbose;
        this.#reportIgnored = options.reportIgnored;
    }

    async run ( action ) {
        const cwd = _path.resolve( this.#cwd || "." ).replaceAll( "\\", "/" );

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

        for ( const path of files.sort( ( a, b ) => _path.dirname( a ).toLowerCase().localeCompare( _path.dirname( b ).toLowerCase() ) || _path.basename( a ).toLowerCase().localeCompare( _path.basename( b ).toLowerCase() ) ) ) {
            const file = new LintFile( new File( { "path": cwd + "/" + path } ), { "write": true } );

            const res = await file.run( action );

            if ( res.status > status ) status = res.status;

            report.total++;

            if ( res.status === 202 ) {
                report.ignored++;
            }
            else {
                report.processed++;

                if ( res.status === 200 ) report.ok++;
                else if ( res.ok ) report.warnings++;
                else report.errors++;

                if ( res.meta.isModified ) report.modified++;
            }

            if ( !this.#verbose ) {
                if ( res.ok && !res.meta.isModified ) continue;
            }

            // skip ignored files
            else if ( !this.#reportIgnored && res.status === 202 ) continue;

            table.add( { "modified": res, "status": res, path } );
        }

        table.end();

        utils.printLintReport( report );

        return result( status );
    }
}
