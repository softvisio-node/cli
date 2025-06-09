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

        // commit subject should not be capitalized
        if ( /^[A-Z][ a-z]/.test( commit.subjectText ) ) {
            return this.#throwError( `Commit message subject should not starts with capital letter.` );
        }

        // commit subject shoult not ends with "."
        if ( commit.subjectText.endsWith( "." ) ) {
            return this.#throwError( `Commit message subject should not ends with ".".` );
        }

        // merge commit
        if ( commit.isMerge ) {

            // merge commit shoild have default message
            if ( !commit.hasDefaultMergeSubject ) {
                return this.#throwError( `Merge commit message should start with "Merge" keyword.` );
            }
        }

        // revert commit
        else if ( isRevert ) {
            if ( !commit.isRevert ) {
                return this.#throwError( `Revert commit message is not valid.` );
            }
        }

        // commit has type
        else if ( commit.type ) {
            const type = pkg.cliConfig?.commits.types[ commit.type ],
                scopes = new Set( pkg.cliConfig?.commits[ type?.other
                    ? "otherScopes"
                    : "scopes" ] || [] );

            // check strict type
            if ( pkg.cliConfig?.commits.strictType ) {

                // commit type is not valid
                if ( !type ) {
                    return this.#throwError( `Commit type is not valid. Allowed types: ${ Object.keys( pkg.cliConfig.commits.types )
                        .sort()
                        .map( item => `"${ item }"` )
                        .join( ", " ) }.` );
                }
            }

            // commit has scope
            if ( commit.scope ) {

                // check strict scope
                if ( type.strictScope ) {

                    // commit scope is not valid
                    if ( !scopes.has( commit.scope ) ) {
                        return this.#throwError( `Commit scope is not valid. Allowed scopes: ${ [ ...scopes ]
                            .sort()
                            .map( item => `"${ item }"` )
                            .join( ", " ) }.` );
                    }
                }
            }

            // commit scope is required
            else if ( type.requireScope ) {
                return this.#throwError( `Commit scope is required.` );
            }
        }

        // revert commit message
        else if ( commit.isRevert ) {
            if ( !isRevert ) {
                return this.#throwError( `Commit revert message should be used only for revert commits.` );
            }
        }

        // commit type is required
        else if ( pkg.cliConfig?.commits.requireType ) {
            return this.#throwError( `Commit message must follow conventional commits syntax.` );
        }
    }

    // private
    #throwError ( msg ) {
        throw result( [ 500, msg + "\nRefer to the documentation: https://softvisio-node.github.io/cli/#/commits" ] );
    }
}
