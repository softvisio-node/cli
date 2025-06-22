import ThreadsPoolQueue from "#core/threads/pool/queue";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "direct-dependencies": {
                    "short": "1",
                    "description": "check only the current package direct dependencies",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "outdated": {
                    "short": "O",
                    "description": "exclude outdated dependencies",
                    "default": true,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "linked": {
                    "short": "l",
                    "description": "include linked or missing direct dependencies",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "install": {
                    "short": "i",
                    "description": "install found updatable dependencies",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "reinstall": {
                    "short": "I",
                    "description": `reinstall all dependencies, even if no updates available`,
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
                "force": {
                    "short": "f",
                    "description": `force install and commit if working ttee is dirty`,
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
                "confirm": {
                    "short": "Y",
                    "description": `ask before install dependencies`,
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
            },
            "arguments": {
                "pattern": {
                    "description": `Filter packages using glob patterns.`,
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

        var hasErrors,
            cache = {};

        const packages = res.data,
            threads = new ThreadsPoolQueue( {
                "maxRunningThreads": 5,
            } );

        for ( const pkg of packages ) {
            threads.pushThread( async () => {
                const res = await pkg.getOutdatedDependencies( {
                    "all": !process.cli.options[ "direct-dependencies" ],
                } );

                return result( res, {
                    pkg,
                    "dependencies": res.data,
                } );
            } );

            if ( process.cli.options[ "sub-packages" ] ) {
                for ( const subPkg of pkg.subPackages ) {
                    threads.pushThread( async () => {
                        const res = await subPkg.getOutdatedDependencies( {
                            "all": !process.cli.options[ "direct-dependencies" ],
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
                    "all": !process.cli.options[ "direct-dependencies" ],
                    "outdated": process.cli.options.outdated,
                    "linked": process.cli.options[ "linked" ],
                    "install": process.cli.options.install,
                    "reinstall": process.cli.options.reinstall,
                    "force": process.cli.options.force,
                    "commit": process.cli.options.commit,
                    "quiet": process.cli.options.quiet,
                    "confirmInstall": process.cli.options.confirm,
                    "outdatedDependencies": res.data.dependencies,
                    cache,
                } );
            }

            if ( !res.ok ) {
                hasErrors = true;
            }
        }

        if ( hasErrors ) {
            return result( [ 500, "Some dependencies wasn't updated" ] );
        }
    }
}
