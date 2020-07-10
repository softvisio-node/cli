const glob = require( "glob" );
const fs = require( "fs" );
const path = require( "path" );

module.exports.getFiles = function ( paths, ext ) {
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
};
