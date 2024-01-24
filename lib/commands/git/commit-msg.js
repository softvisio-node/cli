import Command from "#lib/command";
import fs from "fs";
import Changes from "#lib/git/changes";
import ansi from "#core/text/ansi";

export default class extends Command {

    // static
    static cli () {
        return {
            "arguments": {
                "path": {
                    "description": "path to the commit message",
                    "required": true,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    // public
    async run () {
        const pkg = this._findRootPackage();

        if ( !pkg ) return;

        const msg = fs.readFileSync( process.cli.arguments.path, "utf8" ),
            commit = new Changes.Commit( msg );

        if ( commit.type ) {

            // check type
            if ( pkg.commitsConfig.types.size && !pkg.commitsConfig.types.has( commit.type ) ) {
                this.#throwError( `Commit type is invalid. Allowed types: ${ [ ...pkg.commitsConfig.types ].map( item => `"${ item }"` ).join( ", " ) }.` );
            }

            // check scope
            if ( commit.scope ) {
                if ( pkg.commitsConfig.scopes.size && !pkg.commitsConfig.scopes.has( commit.scope ) ) {
                    this.#throwError( `Commit scope is invalid. Allowed scopes: ${ [ ...pkg.commitsConfig.scopes ].map( item => `"${ item }"` ).join( ", " ) }.` );
                }
            }
            else {
                if ( pkg.commitsConfig.requireScope ) this.#throwError( `Commit scope is required.` );
            }
        }
        else {
            if ( pkg.commitsConfig.strict ) this.#throwError( `Commit message must match conventional commits.` );
        }
    }

    // private
    #throwError ( msg ) {
        this._throwError( ansi.error( " Error " ) + "\n" + msg + "\nRefer to the documentation: https://softvisio-node.github.io/cli/#/commits" );
    }
}
