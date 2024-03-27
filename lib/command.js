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

    _findPackage ( dir ) {
        return Package.findPackage( dir );
    }

    _findGitPackage ( dir ) {
        return Package.findGitPackage( dir );
    }

    _isGitPackageRoot ( dir ) {
        return Package.isGitPackageRoot( dir );
    }
}
