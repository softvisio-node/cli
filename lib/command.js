import env from "#core/env";
import Package from "#lib/package";
import { findWorkspacePackages } from "#lib/utils";

env.loadUserEnv();

export default class {

    // protected
    _isGitPackageRoot ( dir ) {
        return env.isGitPackageRoot( dir );
    }

    _findGitRoot ( dir ) {
        return Package.newGitRoot( dir );
    }

    _findPackage ( dir ) {
        return Package.new( dir );
    }

    _findGitPackage ( dir ) {
        return Package.newGit( dir );
    }

    _findWorkspacePackages ( { patterns, git = true, "package": isPackage = true } = {} ) {
        return findWorkspacePackages( { patterns, git, "package": isPackage } );
    }
}
