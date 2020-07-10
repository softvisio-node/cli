const path = require( "path" );
const result = require( "@softvisio/core/result" );
const File = require( "./src/file" );
const util = require( "./util" );

module.exports = class Src {
    #paths;
    #ext;
    #reportIgnored;

    constructor ( paths, options = {} ) {
        this.#paths = Array.isArray( paths ) ? paths : [paths];

        this.#ext = options.ext;

        this.#reportIgnored = options.reportIgnored;
    }

    run ( action ) {
        const files = util.getFiles( this.#paths, this.#ext ),
            colors = require( "ansi-colors" );

        colors.theme( {
            "error": colors.bgRed.bold.white,
        } );

        if ( !files.length ) return result( 200 );

        const relPaths = {};
        let maxPathLength = 0;

        for ( const filePath of files ) {
            relPaths[filePath] = path.relative( ".", filePath ).replace( /\\/g, "/" );

            const filePathLength = relPaths[filePath].length;

            if ( filePathLength > maxPathLength ) maxPathLength = filePathLength;
        }

        let status = 200;

        for ( const filePath of files.sort( ( a, b ) => path.dirname( a ).toLowerCase().localeCompare( path.dirname( b ).toLowerCase() ) || path.basename( a ).toLowerCase().localeCompare( path.basename( b ).toLowerCase() ) ) ) {
            const file = new File( filePath, { "ignoreUnsupported": true } );

            const res = file.run( action );

            // skip ignored files
            if ( !this.#reportIgnored && res.status === 202 ) continue;

            if ( res.status > status ) status = res.status;

            const relPath = relPaths[filePath] + " ".repeat( maxPathLength - relPaths[filePath].length );

            console.log( `${relPath}    ${res.isModified ? "modified" : " -      "}    ${res.ok ? res : colors.error( " " + res + " " )}` );
        }

        return result( status );
    }
};
