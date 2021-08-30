import Command from "#lib/command";
import * as utils from "#core/utils";
import fs from "fs";
import os from "os";

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
        if ( process.cli.options.global ) await this.#installGlobal();

        if ( process.cli.options.local ) await this.#installLocal();
    }

    // private
    async #installGlobal () {
        const git = this._getGit();

        const hooksPath = await git.run( "config", "--global", "--get", "core.hookspath" );

        if ( !hooksPath.ok ) this._throwError( `Git run error.` );

        if ( !hooksPath.data ) this._throwError( `Unable to find global git hooks path. Check, that your global git config file contains "core.hookspath" variable defined.` );

        hooksPath.data = hooksPath.data.trim();

        if ( hooksPath.data.charAt( 0 ) === "~" ) hooksPath.data = os.homedir() + "/" + hooksPath.data.substr( 1 );

        if ( !fs.existsSync( hooksPath.data ) ) fs.mkdirSync( hooksPath.data, { "recursive": true } );

        // install pre-commit hook
        if ( !fs.existsSync( hooksPath.data + "/pre-commit" ) || ( await utils.confirm( "Global pre-commit hook is already exists. Overwrite?", ["n", "y"] ) ) === "y" ) {
            fs.copyFileSync( utils.resolve( "#resources/pre-commit", import.meta.url ), hooksPath.data + "/pre-commit" );

            console.log( "Global git pre-commit hook installed." );
        }

        // install commit-msg hook
        if ( !fs.existsSync( hooksPath.data + "/commit-msg" ) || ( await utils.confirm( "Global commit-msg hook is already exists. Overwrite?", ["n", "y"] ) ) === "y" ) {
            fs.copyFileSync( utils.resolve( "#resources/commit-msg", import.meta.url ), hooksPath.data + "/commit-msg" );

            console.log( "Global git commit-msg hook installed." );
        }
    }

    async #installLocal () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Unable to find project root.` );

        const hooksPath = rootPackage.root + "/.git/hooks";

        if ( !fs.existsSync( hooksPath ) ) fs.mkdirSync( hooksPath, { "recursive": true } );

        var installed;

        // install pre-commit hook
        if ( !fs.existsSync( hooksPath + "/pre-commit" ) || ( await utils.confirm( "Local pre-commit hook is already exists. Overwrite?", ["n", "y"] ) ) === "y" ) {
            fs.copyFileSync( utils.resolve( "#resources/pre-commit", import.meta.url ), hooksPath + "/pre-commit" );

            console.log( "Local git pre-commit hook installed." );

            installed = true;
        }

        // install commit-msg hook
        if ( !fs.existsSync( hooksPath + "/commit-msg" ) || ( await utils.confirm( "Local commit-msg hook is already exists. Overwrite?", ["n", "y"] ) ) === "y" ) {
            fs.copyFileSync( utils.resolve( "#resources/commit-msg", import.meta.url ), hooksPath + "/commit-msg" );

            installed = true;

            console.log( "Local git commit-msg hook installed." );
        }

        if ( installed ) {
            const res = await rootPackage.git.run( "config", "--local", "--replace-all", "core.hooksPath", ".git/hooks" );
            if ( !res.ok ) this._throwError( `Unable to update local git config.` );
            console.log( "Local git config updated." );
        }
    }
}
