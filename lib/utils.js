import { ansi, Table } from "#core/text";
import glob from "glob";
import _path from "path";
import LintIgnore from "#lib/lintignore";

export function getLintReportTable ( options = {} ) {
    return new Table( {
        "console": true,
        "lazy": true,
        "style": "borderless",
        ...options,
        "columns": {
            "status": {
                "title": ansi.hl( "Status" ),
                "width": 9,
                "align": "center",
                format ( res ) {
                    if ( res.status === 200 ) return "OK";
                    else if ( res.status === 202 ) return ansi.dim( "IGNORED" );
                    else if ( res.ok ) return ansi.warn( " WARNING " );
                    else return ansi.error( " ERROR " );
                },
            },
            "modified": {
                "title": ansi.hl( "Modified" ),
                "width": 12,
                "margin": [1, 1],
                "align": "center",
                "format": res => ( res.isModified ? ansi.error( " MODIFIED " ) : " - " ),
            },
            "path": {
                "title": ansi.hl( "Path" ),
                "flex": 1,
            },
        },
    } );
}

export function printLintReport ( report ) {
    console.log( `
Total files: ${report.total}, ignored: ${report.ignored}, processed: ${report.processed}
Modified: ${report.modified || "-"}, warnings: ${report.warnings ? ansi.warn( ` ${report.warnings} ` ) : "-"}, errors: ${report.errors ? ansi.error( ` ${report.errors} ` ) : "-"}` );
}

export function getFiles ( patterns, options ) {
    var files = {};

    // resolve cwd
    const cwd = _path.resolve( options.cwd || "." ).replace( /\\/g, "/" );

    // do nothing, if cwd is under ".git" directory
    if ( cwd.match( /\/\.git(?:\/|$)/i ) ) return [cwd, []];

    for ( const pattern of Array.isArray( patterns ) ? patterns : [patterns] ) {
        const found = glob.sync( pattern, {
            "cwd": options.cwd || "",
            "nodir": true,
            "dot": true,
            "ignore": ["**/.git/**", "**/node_modules/**"],
        } );

        found.forEach( file => ( files[file] = true ) );
    }

    files = Object.keys( files );

    if ( options.useLintIgnore ) {
        const lintIgnore = new LintIgnore( cwd );

        files = lintIgnore.filter( files );
    }

    return [cwd, files];
}
