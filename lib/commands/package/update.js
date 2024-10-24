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
        };
    }

    // public
    async run () {
        const pkg = this._findGitPackage();

        if ( !pkg ) return result( [ 500, `Unable to find package` ] );

        var hasErrors;

        for ( const pack of [ pkg, ...pkg.subPackages ] ) {
            const res = await pack.updateDependencies( {
                "update": process.cli.options.update,
                "all": process.cli.options.all,
                "updatable": process.cli.options.updatable,
                "missing": process.cli.options.missing,
                "internal": process.cli.options.internal,
                "external": process.cli.options.external,
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
