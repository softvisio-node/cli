import ThreadsPoolQueue from "#core/threads/pool/queue";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "update": {
                    "description": "update outdated dependencies",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "missing": {
                    "description": "update missing dependencies",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "commit": {
                    "short": "C",
                    "description": "do not commit and push changes",
                    "default": true,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "yes": {
                    "short": "y",
                    "description": `answer "YES" on all questions`,
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
            },
            "arguments": {
                "pattern": {
                    "description": `filter packages using patterns`,
                    "schema": { "type": "array", "items": { "type": "string" } },
                },
            },
        };
    }

    // public
    async run () {
        var res = this._findWorkspacePackages( {
            "patterns": process.cli.arguments?.pattern,
        } );
        if ( !res.ok ) return res;

        const packages = res.data;

        var hasErrors;

        const threads = new ThreadsPoolQueue( {
            "maxRunningThreads": 10,
        } );

        for ( const pkg of packages ) {
            threads.pushThread( async () => {
                const res = await pkg.getOutdatedDependencies();

                res.data ??= {};
                res.data.pkg = pkg;

                return res;
            } );

            for ( const subPkg of pkg.subPackages ) {
                threads.pushThread( async () => {
                    const res = await subPkg.getOutdatedDependencies();

                    res.data ??= {};
                    res.data.pkg = subPkg;

                    return res;
                } );
            }
        }

        while ( ( res = await threads.getResult() ) ) {
            if ( res.ok ) {
                const pkg = delete res.data.pkg;

                res = pkg.checkOutdatedDependencies( {
                    "update": process.cli.options.update,
                    "updateMissing": process.cli.options.missing,
                    "commit": process.cli.options.commit,
                    "yes": process.cli.options.yes,
                    "outdatedDependencies": res.data,
                } );
            }

            if ( !res.ok ) {
                hasErrors = true;
            }
        }

        if ( hasErrors ) {
            return result( 500 );
        }
        else {
            return result( 200 );
        }
    }
}
