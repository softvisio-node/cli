import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "all": {
                    "short": "a",
                    "description": "check full dependency tree, including sub-dependencies",
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
                    "description": "include workspace (internal) dependencies only",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "no-workspace": {
                    "short": "W",
                    "description": "include not-workspace (external) dependencies only",
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
                    "description": "install updatable dependencies",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "force": {
                    "short": "f",
                    "description": `force install dependencies, even if no updates available`,
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
        };
    }

    // public
    async run () {
        const pkg = this._findGitPackage();

        if ( !pkg ) return result( [ 500, `Unable to find package` ] );

        var hasErrors;

        for ( const pack of [ pkg, ...( process.cli.options[ "sub-packages" ]
            ? pkg.subPackages
            : [] ) ] ) {
            const res = await pack.updateDependencies( {
                "all": process.cli.options.all,
                "updatable": process.cli.options.updatable,
                "outdated": process.cli.options.outdated,
                "workspace": process.cli.options.workspace && process.cli.options[ "no-workspace" ]
                    ? null
                    : process.cli.options.workspace
                        ? true
                        : process.cli.options[ "no-workspace" ]
                            ? false
                            : null,
                "missing": process.cli.options.missing,
                "install": process.cli.options.install,
                "force": process.cli.options.force,
                "commit": process.cli.options.commit,
                "quiet": process.cli.options.quiet,
                "yes": process.cli.options.yes,
            } );

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
