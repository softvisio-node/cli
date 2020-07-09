const fs = require( "fs" );
const path = require( "path" );

module.exports = class {
    _isPackageRoot ( root ) {
        return fs.existsSync( root + "/package.json" );
    }

    _isProjectRoot ( root ) {
        return fs.existsSync( root + "/package.json" ) && fs.existsSync( root + "/.git" );
    }

    _isSubProjectRoot ( root ) {
        return fs.existsSync( root + "/package.json" ) && !fs.existsSync( root + "/.git" );
    }

    _getPackageRoot ( cwd ) {
        var root = path.normalize( path.resolve( cwd || process.cwd() ) );

        while ( 1 ) {
            if ( this._isPackageRoot( root ) ) return root.replace( /\\/g, "/" );

            if ( path.dirname( root ) === root ) break;

            root = path.dirname( root );
        }
    }

    _getProjectRoot ( cwd ) {
        var root = path.normalize( path.resolve( cwd || process.cwd() ) );

        while ( 1 ) {
            if ( this._isProjectRoot( root ) ) return root.replace( /\\/g, "/" );

            if ( path.dirname( root ) === root ) break;

            root = path.dirname( root );
        }
    }

    _getSubProjects ( root ) {
        const projects = fs
            .readdirSync( root, { "withFileTypes": true } )
            .filter( entry => entry.isDirectory() )
            .map( entry => root + "/" + entry.name )
            .filter( entry => this._isSubProjectRoot( entry ) );

        return projects;
    }

    _getGit ( root ) {
        const Git = require( "./git" );

        return new Git( root );
    }

    _throwError ( msg ) {
        console.log( msg + "" );

        process.exit( 2 );
    }
};
