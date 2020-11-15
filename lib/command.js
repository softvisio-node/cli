const Package = require( "./package" );

const fs = require( "fs" );
const path = require( "path" );
const os = require( "os" );

module.exports = class {
    _getUserConfig () {
        const path = os.homedir() + "/.softvisio/config.js";

        if ( fs.existsSync( path ) ) return require( path );

        return {};
    }

    _throwError ( msg ) {
        console.log( msg + "" );

        this._exitOnError();
    }

    _exitOnError () {
        process.exit( 2 );
    }

    _findNearestPackage ( dir ) {
        return Package.getNearestPackage( dir );
    }

    _findRootPackage ( dir ) {
        return Package.findRootPackage( dir );
    }

    _isPackageDir ( dir ) {
        return Package.isPackageDir( dir );
    }

    _isRootPackageDir ( dir ) {
        return Package.isRootPackageDir( dir );
    }

    // ----------------------------------------------------------------

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
        const path = require( "path" );

        const projects = fs
            .readdirSync( root, { "withFileTypes": true } )
            .filter( entry => entry.isDirectory() )
            .map( entry => path.posix.normalize( root + "/" + entry.name ) )
            .filter( entry => this._isSubProjectRoot( entry ) );

        return projects;
    }

    _getGit ( root ) {
        const Git = require( "./git" );

        return new Git( root );
    }
};
