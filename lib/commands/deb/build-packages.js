import { confirm } from "#core/utils";
import Command from "#lib/command";
import DebianRepository from "#lib/debian-repository";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "codename": {
                    "description": "Ubuntu codename.",
                    "schema": {
                        "type": "array",
                        "items": {
                            "type": "string",
                        },
                        "uniqueItems": true,
                    },
                },
                "build-version": {
                    "short": "v",
                    "description": "Build specific version",
                    "schema": {
                        "type": "array",
                        "items": {
                            "type": "string",
                        },
                        "uniqueItems": true,
                    },
                },
                "yes": {
                    "short": "y",
                    "description": `answer "yes" on all questions`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "package": {
                    "description": `Packages to build. Do not specify to build all packages.`,
                    "schema": {
                        "type": "array",
                        "items": {
                            "type": "string",
                        },
                        "uniqueItems": true,
                    },
                },
            },
        };
    }

    // public
    async run () {
        const root = this._findGitPackage()?.root;
        if ( !root ) return result( [ 500, `Unable to find root package` ] );

        if ( !process.cli.arguments.package && !process.cli.options.yes ) {
            if ( ( await confirm( "Build all packages?" ) ) !== "yes" ) return result( [ 400, "Cancelled" ] );
        }

        const debianRepository = new DebianRepository( root );

        const res = await debianRepository.checkRepository();
        if ( !res.ok ) return res;

        return debianRepository.buildPackages( {
            "packages": process.cli.arguments.package,
            "codenames": process.cli.options.codename,
            "versions": process.cli.options[ "build-version" ],
        } );
    }
}
