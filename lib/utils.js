import env from "#core/env";
import glob from "#core/glob";
import { ansi, Table } from "#core/text";
import Package from "#lib/package";

env.loadUserEnv();

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
                "margin": [ 1, 1 ],
                "align": "center",
                "format": res => ( res.meta.isModified
                    ? ansi.error( " MODIFIED " )
                    : " - " ),
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
Total files: ${ report.total }, ignored: ${ report.ignored }, processed: ${ report.processed }
Modified: ${ report.modified || "-" }, warnings: ${ report.warnings
    ? ansi.warn( ` ${ report.warnings } ` )
    : "-" }, errors: ${ report.errors
    ? ansi.error( ` ${ report.errors } ` )
    : "-" }` );
}

export function findWorkspacePackages ( { patterns, git = true } = {} ) {
    const workspace = process.env[ "SOFTVISIO_CLI_WORKSPACE_" + process.platform ];

    if ( !workspace ) return result( [ 500, `No workspace configured` ] );

    if ( patterns ) {
        if ( Array.isArray( patterns ) ) {
            if ( !patterns.length ) patterns = null;
        }
        else {
            patterns = [ patterns ];
        }
    }

    if ( patterns ) {
        try {
            patterns = patterns.map( pattern => new RegExp( pattern, "i" ) );
        }
        catch {
            return result( [ 400, "Patterns are not valid" ] );
        }
    }

    const projects = glob( "*/*", {
        "cwd": workspace,
        "files": false,
        "directories": true,
    } );

    const packages = [];

    for ( const project of projects ) {

        // filter by patterns
        if ( patterns ) {
            let match;

            for ( const pattern of patterns ) {
                if ( pattern.test( project ) ) {
                    match = true;

                    break;
                }
            }

            if ( !match ) continue;
        }

        if ( git && !env.isGitPackageRoot( workspace + "/" + project ) ) continue;

        const pkg = new Package( workspace + "/" + project );

        packages.push( pkg );
    }

    return result( 200, packages );
}
