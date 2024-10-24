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
                "all": {
                    "short": "a",
                    "description": "check all dependencies",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "updatable": {
                    "short": "U",
                    "description": "show updatable dependencies only",
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
                "internal": {
                    "short": "I",
                    "description": "ignore internal dependencies",
                    "default": true,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "external": {
                    "short": "E",
                    "description": "ignore external dependencies",
                    "default": true,
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

        var hasErrors;

        const packages = res.data,
            cache = {},
            threads = new ThreadsPoolQueue( {
                "maxRunningThreads": 10,
            } );

        for ( const pkg of packages ) {
            threads.pushThread( async () => {
                const res = await pkg.getOutdatedDependencies( {
                    "all": process.cli.options.all,
                } );

                return result( res, {
                    pkg,
                    "dependencies": res.data,
                } );
            } );

            for ( const subPkg of pkg.subPackages ) {
                threads.pushThread( async () => {
                    const res = await subPkg.getOutdatedDependencies( {
                        "all": process.cli.options.all,
                    } );

                    return result( res, {
                        "pkg": subPkg,
                        "dependencies": res.data,
                    } );
                } );
            }
        }

        while ( ( res = await threads.getResult() ) ) {
            if ( res.ok ) {
                const pkg = res.data.pkg;

                res = await pkg.updateDependencies( {
                    "update": process.cli.options.update,
                    "all": process.cli.options.all,
                    "updatable": process.cli.options.updatable,
                    "missing": process.cli.options.missing,
                    "internal": process.cli.options.internal,
                    "external": process.cli.options.external,
                    "commit": process.cli.options.commit,
                    "yes": process.cli.options.yes,
                    cache,
                    "outdatedDependencies": res.data.dependencies,
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
