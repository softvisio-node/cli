const path = require( "path" );
const result = require( "@softvisio/core/result" );
const glob = require( "glob" );
const fs = require( "fs" );
const File = require( "./src/file" );

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
        const files = this._getFiles( this.#paths, this.#ext ),
            util = require( "./util" );

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

            const res = file.run( action );

            // skip ignored files
            if ( !this.#reportIgnored && res.status === 202 ) continue;

            if ( res.status > status ) status = res.status;

            util.reportFile( relPaths[filePath], res, maxPathLength );
        }

        return result( status );
    }

    _getFiles ( paths, ext ) {
        var files = {};

        for ( let pattern of paths ) {
            pattern = pattern.replace( /\\/g, "/" );

            if ( !glob.hasMagic( pattern ) ) {
                let stat;

                try {
                    stat = fs.statSync( pattern );
                }
                catch ( e ) {
                    continue;
                }

                if ( stat.isFile() ) {
                    files[path.resolve( pattern ).replace( /\\/g, "/" )] = true;

                    continue;
                }
                else if ( stat.isDirectory() ) {
                    pattern += "/**";
                }
                else {
                    continue;
                }
            }

            for ( const file of glob.sync( pattern, { "nodir": true, "dot": true } ) ) {

                // ignore "node_modules" directory
                if ( file.match( /(^|\/)node_modules\// ) ) continue;

                const absPath = path.resolve( file ).replace( /\\/g, "/" );

                files[absPath] = true;
            }
        }

        files = Object.keys( files ).sort();

        // filter files by extensions
        files = files.filter( file => {

            // ignore ".git" directory
            if ( file.indexOf( "/.git/" ) > -1 ) return false;

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
