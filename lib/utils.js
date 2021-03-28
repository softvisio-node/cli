const ansi = require( "@softvisio/core/ansi" );
const glob = require( "glob" );
const { Minimatch } = require( "minimatch" );
const _path = require( "path" );
const Package = require( "./package" );
const Table = require( "@softvisio/core/text/table" );

module.exports.getLintReportTable = function () {
    return new Table( {
        "console": true,
        "lazy": true,
        "style": "no-border",
        "columns": {
            "status": {
                "title": ansi.hl( "Lint Status" ),
                "width": 20,
                "margin": [0, 1],
                format ( res ) {
                    if ( res.status === 200 ) return res.reason;
                    else if ( res.status === 202 ) return res.reason;
                    else if ( res.ok ) return ansi.warn( " " + res.reason + " " );
                    else return ansi.error( " " + res.reason + " " );
                },
            },
            "modified": {
                "title": ansi.hl( "Modified" ),
                "width": 12,
                "margin": [1, 1],
                "align": "center",
                "format": res => ( res.isModified ? ansi.error( " modified " ) : " - " ),
            },
            "path": {
                "title": ansi.hl( "Path" ),
                "flex": 1,
                "margin": [1, 0],
            },
        },
    } );
};

module.exports.printLintReport = function ( report ) {
    console.log( `
Total files: ${report.total}, ignored: ${report.ignored}, processed: ${report.processed}
Modified: ${report.modified}, warnings: ${ansi.warn( " " + report.warnings + " " )}, errors: ${ansi.error( " " + report.errors + " " )}
        ` );
};

module.exports.getFiles = function ( patterns, options ) {
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
                if ( pkg ) pkg.minimatch = pkg.config.lint.map( pattern => new Minimatch( pattern, { "dot": true } ) );

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
};
