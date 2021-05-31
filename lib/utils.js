import { ansi, Table } from "#core/text";
import glob from "glob";
import minimatch from "minimatch";
import _path from "path";
import Package from "./package.js";

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
Modified: ${report.modified}, warnings: ${ansi.warn( " " + report.warnings + " " )}, errors: ${ansi.error( " " + report.errors + " " )}` );
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

    const packageCache = {};

    files = Object.keys( files ).filter( file => {
        if ( options.useIncludePatterns ) {
            const dirname = _path.dirname( cwd + "/" + file );

            if ( packageCache[dirname] == null ) {
                let pkg = Package.findNearestPackage( cwd + "/" + file );

                if ( !pkg || !pkg.config.lint || !pkg.config.lint.length ) pkg = false;

                // pre-cache minimatch pattern objects
                if ( pkg ) pkg.minimatch = pkg.config.lint.map( pattern => new minimatch.Minimatch( pattern, { "dot": true } ) );

                packageCache[dirname] = pkg;
            }

            const pkg = packageCache[dirname];

            if ( pkg ) {
                const relPath = _path.relative( pkg.root, file );

                for ( const pattern of pkg.minimatch ) {

                    // file match include pattern
                    if ( pattern.match( relPath ) ) return true;
                }

                // skip, if file don't match any include pattern
                return false;
            }
        }

        return true;
    } );

    return [cwd, files];
}
