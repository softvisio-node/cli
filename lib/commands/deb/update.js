import Command from "#lib/command";
import Deb from "#lib/deb";

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

        const deb = new Deb( root );

        const res = await deb.checkRepository();
        if ( !res.ok ) return res;

        return deb.update( {
            "deleteOutdatedPackages": process.cli.options[ "delete-outdated-packages" ],
        } );
    }
}
