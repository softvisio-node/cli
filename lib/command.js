import env from "#core/env";
import Package from "./package.js";

env.loadUserEnv();

export default class {

    // protected
    _isGitPackageRoot ( dir ) {
        return env.isGitPackageRoot( dir );
    }

    _findPackage ( dir ) {
        return Package.new( dir );
    }

    _findGitPackage ( dir ) {
        return Package.newGit( dir );
    }
}
