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
                    "description": "show updatable dependencies only",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "outdated": {
                    "short": "o",
                    "description": "show outdated dependencies only",
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
                    "description": "update missing dependencies",
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
                "install": process.cli.options.install,
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
                "quiet": process.cli.options.quiet,
                "commit": process.cli.options.commit,
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
