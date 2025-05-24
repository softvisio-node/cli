import fs from "node:fs";
import Commit from "#core/api/git/commit";
import Command from "#lib/command";

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
            isRevert = fs.existsSync( ".git/REVERT_HEAD" );

        if ( fs.existsSync( ".git/MERGE_HEAD" ) ) {
            var parentHashes = new Set( [ fs.readFileSync( ".git/ORIG_HEAD", "latin1" ).trim(), ...fs.readFileSync( ".git/MERGE_HEAD", "latin1" ).trim().split( "\n" ) ] );
        }

        const commit = new Commit( {
            message,
            parentHashes,
        } );

        // revert commit
        if ( isRevert ) {
            if ( !commit.isRevert ) {
                return this.#throwError( `Revert commit message is not valid.` );
            }
        }

        // merge commit
        else if ( commit.isMerge ) {
            if ( !commit.isMergeSubject ) {
                return this.#throwError( `Merge commit message should start with "Merge" keyword.` );
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

        // revert commit message
        else if ( commit.isRevert ) {
            if ( !isRevert ) {
                return this.#throwError( `Commit revert message should be used only for revert commits.` );
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
