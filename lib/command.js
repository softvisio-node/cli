import Package from "./package.cjs";
import fs from "fs";
import os from "os";

export default class {
    async _getUserConfig () {
        const path = os.homedir() + "/.softvisio/config.js";

        if ( fs.existsSync( path ) ) return ( await import( path ) ).default;

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
}
