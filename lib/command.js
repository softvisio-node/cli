import Package from "./package.js";
import env from "#core/env";

env.loadUserEnv();

export default class {

    // protected
    // XXX remove
    _throwError ( msg ) {
        console.error( "Error:", msg.statusText ?? msg + "" );

        process.exit( 2 );
    }

    _isGitPackageRoot ( dir ) {
        return env.isGitPackageRoot( dir );
    }

    _findPackage ( dir ) {
        return Package.findPackage( dir );
    }

    _findGitPackage ( dir ) {
        return Package.findGitPackage( dir );
    }
}
