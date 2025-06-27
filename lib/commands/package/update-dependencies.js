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
        };
    }

    // public
    async run () {
        const pkg = this._findGitPackage();

        if ( !pkg ) return result( [ 500, `Unable to find package` ] );

        var hasErrors,
            cache = {};

        for ( const pack of [ pkg, ...( process.cli.options[ "sub-packages" ]
            ? pkg.subPackages
            : [] ) ] ) {
            const res = await pack.updateDependencies( {
                "all": !process.cli.options[ "direct-dependencies" ],
                "outdated": process.cli.options.outdated,
                "linked": process.cli.options[ "linked" ],
                "install": process.cli.options.install,
                "reinstall": process.cli.options.reinstall,
                "commit": process.cli.options.commit,
                "quiet": process.cli.options.quiet,
                "confirmInstall": process.cli.options.confirm,
                cache,
            } );

            if ( !res.ok ) {
                hasErrors = true;
            }
        }

        if ( hasErrors ) {
            return result( [ 500, "Some dependencies wasn't updated" ] );
        }
        else {
            return result( 200 );
        }
    }
}
