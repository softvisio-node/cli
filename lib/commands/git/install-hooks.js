import fs from "node:fs";
import os from "node:os";
import Git from "#core/api/git";
import * as utils from "#core/utils";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "global": {
                    "description": "install Git hooks globally",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    // public
    async run () {
        var res;

        if ( process.cli.options.global ) {
            res = await this.#installGlobal();
        }
        else {
            res = await this.#installLocal();
        }

        return res;
    }

    // private
    async #installGlobal () {
        const git = new Git();

        var res;

        res = await git.run( "config", "--global", "--get", "core.hookspath" );

        if ( !res.ok ) return result( [ 500, `Git run error` ] );

        if ( !res.data ) return result( [ 500, `Unable to find global git hooks path. Check, that your global git config file contains "core.hookspath" variable defined.` ] );

        var hooksPath = res.data.trim();

        if ( hooksPath.startsWtth( "~" ) ) hooksPath = os.homedir() + "/" + hooksPath.slice( 1 );

        if ( !fs.existsSync( hooksPath ) ) {
            fs.mkdirSync( hooksPath, {
                "recursive": true,
            } );
        }

        // install "pre-commit" hook
        fs.copyFileSync( utils.resolve( "#resources/git-hooks/pre-commit", import.meta.url ), hooksPath + "/pre-commit" );
        console.log( `Global Git "pre-commit" hook installed` );

        // install "commit-msg" hook
        fs.copyFileSync( utils.resolve( "#resources/git-hooks/commit-msg", import.meta.url ), hooksPath + "/commit-msg" );
        console.log( `Global Git "commit-msg" hook installed` );

        return result( 200 );
    }

    async #installLocal () {
        const pkg = this._findGitPackage();

        if ( !pkg ) return result( [ 500, `Unable to find root package` ] );

        const hooksPath = pkg.root + "/.git/hooks";

        if ( !fs.existsSync( hooksPath ) ) {
            fs.mkdirSync( hooksPath, {
                "recursive": true,
            } );
        }

        // install "pre-commit" hook
        fs.copyFileSync( utils.resolve( "#resources/git-hooks/pre-commit", import.meta.url ), hooksPath + "/pre-commit" );
        console.log( `Local Git "pre-commit" hook installed` );

        // install "commit-msg" hook
        fs.copyFileSync( utils.resolve( "#resources/git-hooks/commit-msg", import.meta.url ), hooksPath + "/commit-msg" );
        console.log( `Local Git "commit-msg" hook installed` );

        // update git config
        const res = await pkg.git.run( "config", "--local", "--replace-all", "core.hooksPath", ".git/hooks" );
        if ( !res.ok ) return result( [ 500, `Unable to update local git config` ] );

        console.log( `Local Git config updated` );

        return result( 200 );
    }
}
