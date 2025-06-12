import fs from "node:fs";
import ansi from "#core/ansi";
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

        // prepare types
        const types = {};
        for ( const [ type, config ] of Object.entries( pkg.cliConfig?.commits.types || {} ) ) {
            if ( !config ) continue;

            types[ type ] = {
                ...config,
                type,
            };
        }

        const message = fs.readFileSync( process.cli.arguments.path, "utf8" ),
            isRevert = fs.existsSync( ".git/REVERT_HEAD" );

        if ( fs.existsSync( ".git/MERGE_HEAD" ) ) {
            var parentHashes = new Set( [ fs.readFileSync( ".git/ORIG_HEAD", "latin1" ).trim(), ...fs.readFileSync( ".git/MERGE_HEAD", "latin1" ).trim().split( "\n" ) ] );
        }

        const commit = new Commit( {
            message,
            parentHashes,
        } );

        // merge commit
        if ( commit.isMerge ) {

            // merge commit should have default message
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

            // commit subject should not be capitalized
            if ( /^[A-Z][ a-z]/.test( commit.subjectText ) ) {
                return this.#throwError( `Commit message subject should not starts with capital letter.` );
            }

            // commit subject should not ends with "."
            if ( commit.subjectText.endsWith( "." ) ) {
                return this.#throwError( `Commit message subject should not ends with ".".` );
            }

            const type = types[ commit.type ],
                scopes = new Map( Object.entries( pkg.cliConfig?.commits[ type?.primaryChange
                    ? "primaryScopes"
                    : "secondaryScopes" ] || {} ).filter( ( [ key, value ] ) => value ) );

            // check strict type
            if ( pkg.cliConfig?.commits.strictType ) {

                // commit type is not valid
                if ( !type ) {
                    return this.#throwError( `Commit type is not valid. Allowed types:\n${ this.#getAllowedTypes( types ) }` );
                }
            }

            // commit has scope
            if ( commit.scope ) {

                // check strict scope
                if ( type.strictScope ) {

                    // commit scope is not valid
                    if ( !scopes.has( commit.scope ) ) {
                        if ( scopes.size ) {
                            return this.#throwError( `Commit scope is not valid. Allowed scopes for this commit type are:\n${ this.#getAllowedScopes( scopes ) }` );
                        }
                        else {
                            return this.#throwError( `Commit scope is not allowed for this commit type.` );
                        }
                    }
                }
            }

            // commit scope is required
            else if ( type.requireScope && scopes.size ) {
                return this.#throwError( `Commit scope is required. Allowed scopes for this commit type are:\n${ this.#getAllowedScopes( scopes ) }` );
            }

            // restrict breaking changes to the primary changes only
            if ( commit.isBreakingChange && type && !type.primaryChange ) {
                return this.#throwError( `Breaking change flag can be set for primary changes only.` );
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
            return this.#throwError( `Commit type is required. Allowed types:\n${ this.#getAllowedTypes( types ) }` );
        }
    }

    // private
    #getAllowedTypes ( types ) {
        return Object.values( types )
            .map( type => `    - "${ type.type }": ${ type.description };` )
            .join( "\n" );
    }

    #getAllowedScopes ( scopes ) {
        return [ ...scopes.keys() ].map( scope => `    - "${ scope }": ${ scopes.get( scope ) };` ).join( "\n" );
    }

    #throwError ( message ) {
        throw result( [ 500, `${ message }\nRefer to the documentation: ${ ansi.link( "https://www.conventionalcommits.org/en/" ) }.` ] );
    }
}
