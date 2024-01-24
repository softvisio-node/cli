import { ansi, Table } from "#core/text";

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
                "format": res => ( res.meta.isModified ? ansi.error( " MODIFIED " ) : " - " ),
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
Modified: ${ report.modified || "-" }, warnings: ${ report.warnings ? ansi.warn( ` ${ report.warnings } ` ) : "-" }, errors: ${ report.errors ? ansi.error( ` ${ report.errors } ` ) : "-" }` );
}
