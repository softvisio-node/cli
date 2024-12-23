import Apt from "#lib/apt";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "delete-outdated-packages": {
                    "short": "D",
                    "description": "do not delete outdated packages",
                    "default": true,
                    "schema": {
                        "type": "boolean",
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

        const res = await apt.checkRepository();
        if ( !res.ok ) return res;

        return apt.update( {
            "deleteOutdatedPackages": process.cli.options[ "delete-outdated-packages" ],
        } );
    }
}
