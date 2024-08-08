import Package from "./package.js";
import env from "#core/env";

env.loadUserEnv();

export default class {

    // protected
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
