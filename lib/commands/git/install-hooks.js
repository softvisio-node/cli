import Command from "#lib/command";
import * as utils from "#core/utils";
import fs from "node:fs";
import os from "node:os";

export default class extends Command {
    static cli () {
        return {
            "options": {
                "global": {
                    "description": "install git hooks globally",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "local": {
                    "description": "install git hook locally to the current project only",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    // public
    async run () {
        if ( process.cli.options.global ) {
            const res = await this.#installGlobal();

            if ( !res.ok ) return res;
        }

        if ( process.cli.options.local ) {
            const res = await this.#installLocal();

            if ( !res.ok ) return res;
        }
    }

    // private
    async #installGlobal () {
        const git = this._getGit();

        const hooksPath = await git.run( "config", "--global", "--get", "core.hookspath" );

        if ( !hooksPath.ok ) return result( [ 500, `Git run error` ] );

        if ( !hooksPath.data ) return result( [ 500, `Unable to find global git hooks path. Check, that your global git config file contains "core.hookspath" variable defined.` ] );

        hooksPath.data = hooksPath.data.trim();

        if ( hooksPath.data.startsWtth( "~" ) ) hooksPath.data = os.homedir() + "/" + hooksPath.data.slice( 1 );

        if ( !fs.existsSync( hooksPath.data ) ) fs.mkdirSync( hooksPath.data, { "recursive": true } );

        // install pre-commit hook
        if ( !fs.existsSync( hooksPath.data + "/pre-commit" ) || ( await utils.confirm( "Global pre-commit hook is already exists. Overwrite?", [ "no", "yes" ] ) ) === "yes" ) {
            fs.copyFileSync( utils.resolve( "#resources/git-hooks/pre-commit", import.meta.url ), hooksPath.data + "/pre-commit" );

            console.log( "Global git pre-commit hook installed." );
        }

        // install commit-msg hook
        if ( !fs.existsSync( hooksPath.data + "/commit-msg" ) || ( await utils.confirm( "Global commit-msg hook is already exists. Overwrite?", [ "no", "yes" ] ) ) === "yes" ) {
            fs.copyFileSync( utils.resolve( "#resources/git-hooks/commit-msg", import.meta.url ), hooksPath.data + "/commit-msg" );

            console.log( "Global git commit-msg hook installed." );
        }

        return result( 200 );
    }

    async #installLocal () {
        const pkg = this._findGitPackage();

        if ( !pkg ) return result( [ 500, `Unable to find root package` ] );

        const hooksPath = pkg.root + "/.git/hooks";

        if ( !fs.existsSync( hooksPath ) ) fs.mkdirSync( hooksPath, { "recursive": true } );

        var installed;

        // install pre-commit hook
        if ( !fs.existsSync( hooksPath + "/pre-commit" ) || ( await utils.confirm( "Local pre-commit hook is already exists. Overwrite?", [ "no", "yes" ] ) ) === "yes" ) {
            fs.copyFileSync( utils.resolve( "#resources/git-hooks/pre-commit", import.meta.url ), hooksPath + "/pre-commit" );

            console.log( "Local git pre-commit hook installed." );

            installed = true;
        }

        // install commit-msg hook
        if ( !fs.existsSync( hooksPath + "/commit-msg" ) || ( await utils.confirm( "Local commit-msg hook is already exists. Overwrite?", [ "no", "yes" ] ) ) === "yes" ) {
            fs.copyFileSync( utils.resolve( "#resources/git-hooks/commit-msg", import.meta.url ), hooksPath + "/commit-msg" );

            installed = true;

            console.log( "Local git commit-msg hook installed." );
        }

        if ( installed ) {
            const res = await pkg.git.run( "config", "--local", "--replace-all", "core.hooksPath", ".git/hooks" );

            if ( !res.ok ) return result( [ 500, `Unable to update local git config` ] );

            console.log( "Local git config updated." );
        }

        return result( 200 );
    }
}
