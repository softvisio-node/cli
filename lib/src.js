const _path = require( "path" );
const result = require( "@softvisio/core/result" );
const File = require( "./src/file" );
const util = require( "./util" );

module.exports = class Src {
    #cwd;
    #patterns;
    #useIncludePatterns;
    #reportIgnored;

    constructor ( patterns, options = {} ) {
        this.#cwd = options.cwd;

        this.#patterns = Array.isArray( patterns ) ? patterns : [patterns];

        this.#useIncludePatterns = options.useIncludePatterns;

        this.#reportIgnored = options.reportIgnored;
    }

    async run ( action ) {
        var [cwd, files] = util.getFiles( this.#patterns, {
            "cwd": this.#cwd,
            "useIncludePatterns": this.#useIncludePatterns,
        } );

        if ( !files.length ) return result( 200 );

        let maxPathLength = 0;

        files = files.filter( file => {
            const type = File.getFileType( file );

            if ( !type && !this.#reportIgnored ) return false;

            if ( file.length > maxPathLength ) maxPathLength = file.length;

            return true;
        } );

        let status = 200;

        for ( const path of files.sort( ( a, b ) => _path.dirname( a ).toLowerCase().localeCompare( _path.dirname( b ).toLowerCase() ) || _path.basename( a ).toLowerCase().localeCompare( _path.basename( b ).toLowerCase() ) ) ) {
            const file = new File( cwd + "/" + path );

            const res = await file.run( action );

            // skip ignored files
            if ( !this.#reportIgnored && res.status === 202 ) continue;

            if ( res.status > status ) status = res.status;

            util.reportFile( path, res, maxPathLength );
        }

        return result( status );
    }
};
