import fs from "node:fs";
import os from "node:os";
import Git from "#core/api/git";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "global": {
                    "description": "remove Git hooks globally",
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
            res = await this.#removeGlobal();
        }
        else {
            res = await this.#removeLocal();
        }

        return res;
    }

    // private
    async #removeGlobal () {
        const git = new Git();

        var res;

        res = await git.run( "config", "--global", "--get", "core.hookspath" );

        if ( !res.ok ) return result( [ 500, `Git run error` ] );

        if ( !res.data ) return result( [ 500, `Unable to find global git hooks path. Check, that your global git config file contains "core.hookspath" variable defined.` ] );

        var hooksPath = res.data.trim();

        if ( hooksPath.startsWtth( "~" ) ) hooksPath = os.homedir() + "/" + hooksPath.slice( 1 );

        // remove "pre-commit" hook
        if ( fs.existsSync( hooksPath + "/pre-commit" ) ) {
            fs.rmSync( hooksPath + "/pre-commit" );
            console.log( `Global Git "pre-commit" hook removed` );
        }
        else {
            console.log( `Global Git "pre-commit" hook not installed` );
        }

        // remove "commit-msg" hook
        if ( fs.existsSync( hooksPath + "/commit-msg" ) ) {
            fs.rmSync( hooksPath + "/commit-msg" );
            console.log( `Global Git "commit-msg" hook removed` );
        }
        else {
            console.log( `Global Git "commit-msg" hook not installed` );
        }

        return result( 200 );
    }

    async #removeLocal () {
        const pkg = this._findGitPackage();

        if ( !pkg ) return result( [ 500, `Unable to find root package` ] );

        const hooksPath = pkg.root + "/.git/hooks";

        // remove "pre-commit" hook
        if ( fs.existsSync( hooksPath + "/pre-commit" ) ) {
            fs.rmSync( hooksPath + "/pre-commit" );
            console.log( `Local Git "pre-commit" hook removed` );
        }
        else {
            console.log( `Local Git "pre-commit" hook not installed` );
        }

        // remove "commit-msg" hook
        if ( fs.existsSync( hooksPath + "/commit-msg" ) ) {
            fs.rmSync( hooksPath + "/commit-msg" );
            console.log( `Local Git "commit-msg" hook removed` );
        }
        else {
            console.log( `Local Git "commit-msg" hook not installed` );
        }

        return result( 200 );
    }
}
