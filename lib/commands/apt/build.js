import Command from "#lib/command";
import Apt from "#lib/apt";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "codename": {
                    "description": "ubuntu codename",
                    "schema": {
                        "type": "array",
                        "items": {
                            "type": "string",
                        },
                        "uniqueItems": true,
                    },
                },
            },
            "arguments": {
                "package": {
                    "description": `Pacjage to build. Use "all" to build all packages.`,
                    "required": true,
                    "schema": {
                        "type": "string",
                    },
                },
            },
        };
    }

    // public
    async run () {
        const root = this._findGitPackage()?.root;

        if ( !root ) return result( [ 500, `Unable to find root package` ] );

        const apt = new Apt( root );

        return apt.build( process.cli.arguments.package, process.cli.options.codenames );
    }
}
