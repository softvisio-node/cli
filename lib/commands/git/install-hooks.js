import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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

        res = await this.#getHooksPath( process.cli.options.global );
        if ( !res.ok ) return res;

        const { pkg, git, hooksPath } = res.data;

        // create hooks dir
        if ( !fs.existsSync( hooksPath ) ) {
            fs.mkdirSync( hooksPath, {
                "recursive": true,
            } );
        }

        // install "pre-commit" hook
        fs.copyFileSync( utils.resolve( "#resources/git-hooks/pre-commit", import.meta.url ), path.join( hooksPath, "pre-commit" ) );
        console.log( `Git "pre-commit" hook installed` );

        // install "commit-msg" hook
        fs.copyFileSync( utils.resolve( "#resources/git-hooks/commit-msg", import.meta.url ), path.join( hooksPath, "commit-msg" ) );
        console.log( `Git "commit-msg" hook installed` );

        if ( !process.cli.options.global ) {
            res = await git.run( "config", "set", "--local", "core.hookspath", path.posix.relative( pkg.root, hooksPath ) );

            if ( !res.ok ) return res;

            console.log( `Git config updated` );
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

            args.push( "--local" );
        }

        res = await git.run( "config", "get", ...args, "core.hookspath" );

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

        return result( 200, {
            pkg,
            git,
            hooksPath,
        } );
    }
}
