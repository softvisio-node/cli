import Package from "./package.js";
import env from "#core/env";

env.loadUserEnv();

export default class {

    // protected
    _throwError ( msg ) {
        console.log( msg.statusText ?? msg + "" );

        this._exitOnError();
    }

    _exitOnError ( code ) {
        process.exit( code || 2 );
    }

    _findNearestPackage ( dir ) {
        return Package.findNearestPackage( dir );
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
