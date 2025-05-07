import fs from "node:fs";
import Command from "#lib/command";
import Commit from "#lib/git/commit";

export default class extends Command {

    // static
    static cli () {
        return {
            "description": `# Conventional commits

Examples:

\`\`\`
# bug fix
git commit -m"fix: commit description"

# feature with scope
git commit -m"feat(core): commit description"

# breaking change feature with scope
git commit -m"feat(core)!: commit description"
\`\`\`
`,
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

        const message = fs.readFileSync( process.cli.arguments.path, "utf8" ),
            commit = new Commit( { message } ),
            isMerge = fs.existsSync( ".git/MERGE_HEAD" );

        // merge commit
        if ( isMerge ) {
            if ( !commit.isMerge ) {
                return this.#throwError( `Merge commit message is not valid.` );
            }
        }

        // commit has type
        else if ( commit.type ) {

            // check type
            if ( pkg.cliConfig.commits?.types?.length && !pkg.cliConfig.commits.types.includes( commit.type ) ) {

                // commit type is not valid
                return this.#throwError( `Commit type is invalid. Allowed types: ${ [ ...pkg.cliConfig.commits.types ].map( item => `"${ item }"` ).join( ", " ) }.` );
            }

            // check scope
            if ( commit.scope ) {
                if ( pkg.cliConfig.commits?.scopes?.length && !pkg.cliConfig.commits.scopes.includes( commit.scope ) ) {

                    // commit scope is not valid
                    return this.#throwError( `Commit scope is invalid. Allowed scopes: ${ [ ...pkg.cliConfig.commits.scopes ].map( item => `"${ item }"` ).join( ", " ) }.` );
                }
            }
            else {

                // commit scope is required
                if ( pkg.cliConfig.commits?.scopeRequired ) {
                    return this.#throwError( `Commit scope is required.` );
                }
            }
        }

        // merge commit message
        else if ( commit.isMerge ) {
            if ( !isMerge ) {
                return this.#throwError( `Commit merge message should be used only for merge commits.` );
            }
        }

        // commit type is required
        else if ( pkg.cliConfig.commits?.strict ) {
            return this.#throwError( `Commit message must follow conventional commits syntax.` );
        }
    }

    // private
    #throwError ( msg ) {
        throw result( [ 500, msg + "\nRefer to the documentation: https://softvisio-node.github.io/cli/#/commits" ] );
    }
}
