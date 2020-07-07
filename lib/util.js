module.exports.getProjectRoot = function ( cwd ) {
    const path = require( "path" ),
        fs = require( "fs" );

    var root = path.normalize( path.resolve( cwd || process.cwd() ) );

    while ( 1 ) {
        if ( fs.existsSync( root + "/package.json" ) && fs.existsSync( root + "/.git" ) ) return root.replace( /\\/g, "/" );

        if ( path.dirname( root ) === root ) break;

        root = path.dirname( root );
    }
};
