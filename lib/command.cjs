const Package = require( "./package.cjs" );

const fs = require( "fs" );
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
};
