import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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

        res = await this.#getHooksPath( process.cli.options.global );
        if ( !res.ok ) return res;

        const hooksPath = res.data;

        // remove "pre-commit" hook
        if ( fs.existsSync( hooksPath + "/pre-commit" ) ) {
            fs.rmSync( hooksPath + "/pre-commit" );
            console.log( `Git "pre-commit" hook removed` );
        }
        else {
            console.log( `Git "pre-commit" hook not installed` );
        }

        // remove "commit-msg" hook
        if ( fs.existsSync( hooksPath + "/commit-msg" ) ) {
            fs.rmSync( hooksPath + "/commit-msg" );
            console.log( `Git "commit-msg" hook removed` );
        }
        else {
            console.log( `Git "commit-msg" hook not installed` );
        }

        return result( 200 );
    }

    // private
    async #getHooksPath ( global ) {
        var res,
            pkg,
            git,
            hooksPath,
            args = [];

        if ( global ) {
            git = new Git();

            args.push( "--global" );
        }
        else {
            pkg = this._findGitPackage();

            if ( !pkg ) return result( [ 500, `Unable to find git package root` ] );

            git = pkg.git;
        }

        res = await git.run( "config", ...args, "--get", "core.hookspath" );

        if ( !res.ok ) return res;

        if ( res.data ) {
            hooksPath = res.data.trim();

            if ( hooksPath.startsWith( "~" ) ) hooksPath = path.join( os.homedir(), hooksPath.slice( 1 ) );

            if ( !global ) {
                hooksPath = path.resolve( pkg.root, hooksPath );
            }
        }
        else {
            if ( global ) {
                return result( [ 500, `Unable to find global Git hooks path. Check, that your global Git config file contains "core.hookspath" variable defined.` ] );
            }
            else {
                hooksPath = pkg.root + "/.git/hooks";
            }
        }

        return result( 200, hooksPath );
    }
}