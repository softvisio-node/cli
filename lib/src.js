const path = require( "path" );
const result = require( "@softvisio/core/result" );
const glob = require( "glob" );
const File = require( "./src/file" );
const util = require( "./util" );

module.exports = class Src {
    #patterns;
    #ext;
    #reportIgnored;
    #cwd;
    #subDir;

    constructor ( patterns, options = {} ) {
        this.#patterns = Array.isArray( patterns ) ? patterns : [patterns];

        this.#ext = options.ext;

        this.#reportIgnored = options.reportIgnored;

        this.#cwd = options.cwd;

        this.#subDir = options.subDir;
    }

    async run ( action ) {
        const files = this._getFiles( this.#patterns, this.#ext );

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
            const file = new File( filePath );

            const res = await file.run( action );

            // skip ignored files
            if ( !this.#reportIgnored && res.status === 202 ) continue;

            if ( res.status > status ) status = res.status;

            util.reportFile( relPaths[filePath], res, maxPathLength );
        }

        return result( status );
    }

    _getFiles ( patterns, ext ) {
        var files = {};

        for ( let pattern of patterns ) {
            pattern = pattern.replace( /\\/g, "/" );

            // pattern is plain file path
            if ( !glob.hasMagic( pattern ) ) {
                pattern = path.resolve( this.#cwd || "", pattern ).replace( /\\/g, "/" );

                files[pattern] = true;

                continue;
            }

            for ( const file of glob.sync( pattern, { "nodir": true, "dot": true, "cwd": this.#cwd || "" } ) ) {

                // ignore "node_modules" directory
                if ( file.match( /(^|\/)node_modules\// ) ) continue;

                const absPath = path.resolve( this.#cwd || "", file ).replace( /\\/g, "/" );

                files[absPath] = true;
            }
        }

        // resolve sub-dir
        if ( this.#subDir ) this.#subDir = path.resolve( this.#cwd || "", this.#subDir ).replace( /\\/g, "/" ) + "/";

        files = Object.keys( files ).sort();

        // filter files by subdir and extensions
        files = files.filter( file => {

            // ignore ".git" directory
            if ( file.indexOf( "/.git/" ) > -1 ) return false;

            // filter by sub-dir
            if ( this.#subDir && file.indexOf( this.#subDir ) === -1 ) return false;

            // filter by extension
            if ( ext && ext.length ) {
                const pathExt = path.extname( file );

                for ( const extName of ext ) {
                    if ( pathExt === extName ) return true;
                }

                return false;
            }

            return true;
        } );

        return files;
    }
};
