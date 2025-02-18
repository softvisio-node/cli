import ThreadsPoolQueue from "#core/threads/pool/queue";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "all": {
                    "short": "a",
                    "description": "check all dependencies",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "updatable": {
                    "short": "u",
                    "description": "exclude not-updatable dependencies",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "outdated": {
                    "short": "o",
                    "description": "exclude not-outdated dependencies",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "workspace": {
                    "short": "w",
                    "description": "show workspace (internal) dependencies only",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "not-workspace": {
                    "short": "W",
                    "description": "show not-workspace (external) dependencies only",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "missing": {
                    "description": "include missing dependencies",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "install": {
                    "description": "install outdated dependencies",
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
                "locked": {
                    "short": "l",
                    "description": "process locked packages only",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "sub-packages": {
                    "short": "S",
                    "description": "ignore sub-packages",
                    "default": true,
                    "schema": { "type": "boolean" },
                },
                "quiet": {
                    "short": "q",
                    "description": "do not show report",
                    "default": false,
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
                    "description": `Filter packages using patterns.`,
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
                "maxRunningThreads": 5,
            } );

        for ( const pkg of packages ) {
            if ( process.cli.options.locked && !pkg.isDependenciesLocked ) continue;

            threads.pushThread( async () => {
                const res = await pkg.getOutdatedDependencies( {
                    "all": process.cli.options.all,
                } );

                return result( res, {
                    pkg,
                    "dependencies": res.data,
                } );
            } );

            if ( process.cli.options[ "sub-packages" ] ) {
                for ( const subPkg of pkg.subPackages ) {
                    if ( process.cli.options.locked && !subPkg.isDependenciesLocked ) continue;

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
        }

        while ( ( res = await threads.getResult() ) ) {
            if ( res.ok ) {
                const pkg = res.data.pkg;

                res = await pkg.updateDependencies( {
                    "all": process.cli.options.all,
                    "updatable": process.cli.options.updatable,
                    "outdated": process.cli.options.outdated,
                    "workspace": process.cli.options.workspace && process.cli.options[ "not-workspace" ]
                        ? null
                        : process.cli.options.workspace
                            ? true
                            : process.cli.options[ "not-workspace" ]
                                ? false
                                : null,
                    "missing": process.cli.options.missing,
                    "install": process.cli.options.install,
                    "commit": process.cli.options.commit,
                    "quiet": process.cli.options.quiet,
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
