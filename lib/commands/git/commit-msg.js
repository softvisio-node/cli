import fs from "node:fs";
import Command from "#lib/command";
import Changes from "#lib/git/changes";

export default class extends Command {

    // static
    static cli () {
        return {
            "arguments": {
                "path": {
                    "description": "Path to the commit message.",
                    "required": true,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    // public
    async run () {
        const pkg = this._findGitPackage();

        if ( !pkg ) return;

        const msg = fs.readFileSync( process.cli.arguments.path, "utf8" ),
            commit = new Changes.Commit( msg );

        if ( commit.type ) {

            // check type
            if ( pkg.cliConfig.commits?.types?.length && !pkg.cliConfig.commits.types.includes( commit.type ) ) {
                return this.#throwError( `Commit type is invalid. Allowed types: ${ [ ...pkg.cliConfig.commits.types ].map( item => `"${ item }"` ).join( ", " ) }.` );
            }

            // check scope
            if ( commit.scope ) {
                if ( pkg.cliConfig.commits?.scopes?.length && !pkg.cliConfig.commits.scopes.includes( commit.scope ) ) {
                    return this.#throwError( `Commit scope is invalid. Allowed scopes: ${ [ ...pkg.cliConfig.commits.scopes ].map( item => `"${ item }"` ).join( ", " ) }.` );
                }
            }
            else {
                if ( pkg.cliConfig.commits?.scopeRequired ) {
                    return this.#throwError( `Commit scope is required.` );
                }
            }
        }
        else if ( pkg.cliConfig.commits?.strict ) {
            return this.#throwError( `Commit message must match conventional commits.` );
        }
    }

    // private
    #throwError ( msg ) {
        return result( [ 500, msg + "\nRefer to the documentation: https://softvisio-node.github.io/cli/#/commits" ] );
    }
}
