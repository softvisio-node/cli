import env from "#core/env";
import glob from "#core/glob";
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

    _findWorkspacePackages ( { pattern, git = true } = {} ) {
        const workspace = process.env[ "SOFTVISIO_CLI_WORKSPACE_" + process.platform ];

        if ( !workspace ) return result( [ 500, `No workspace configured` ] );

        try {
            if ( pattern ) pattern = new RegExp( pattern, "i" );
        }
        catch {
            return result( [ 400, "Pattern is not valid" ] );
        }

        const projects = glob( "*/*", {
            "cwd": workspace,
            "files": false,
            "directories": true,
        } );

        const packages = [];

        for ( const project of projects ) {

            // filter by pattern
            if ( pattern && !pattern.test( project ) ) continue;

            if ( git && !this._isGitPackageRoot( workspace + "/" + project ) ) continue;

            const pkg = new Package( workspace + "/" + project );

            packages.push( pkg );
        }

        return result( 200, packages );
    }
}
