import Package from "./package.js";
import env from "#core/env";

env.loadUserEnv();

export default class {

    // protected
    // XXX remove
    _throwError ( msg ) {
        console.error( msg.statusText ?? msg + "" );

        process.exit( 2 );
    }

    _findNearestPackage ( dir ) {
        return Package.findNearestPackage( dir );
    }

    _findRootPackage ( dir ) {
        return Package.findRootPackage( dir );
    }

    _isRootPackageDir ( dir ) {
        return Package.isRootPackageDir( dir );
    }
}
