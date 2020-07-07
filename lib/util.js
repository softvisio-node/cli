const path = require( "path" );
const fs = require( "fs" );

function isProjectRoot ( root ) {
    return fs.existsSync( root + "/package.json" ) && fs.existsSync( root + "/.git" );
}

module.exports.isProjectRoot = isProjectRoot;

module.exports.getProjectRoot = function ( cwd ) {
    var root = path.normalize( path.resolve( cwd || process.cwd() ) );

    while ( 1 ) {
        if ( isProjectRoot( root ) ) return root.replace( /\\/g, "/" );

        if ( path.dirname( root ) === root ) break;

        root = path.dirname( root );
    }
};

module.exports.throwError = function ( msg ) {
    console.log( msg + "" );

    process.exit( 2 );
};
