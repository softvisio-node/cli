import Command from "#lib/command";
import DebianRepository from "#lib/debian-repository";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "delete-outdated-packages": {
                    "negatedShort": "D",
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

        const debianRepository = new DebianRepository( root );

        const res = await debianRepository.checkRepository();
        if ( !res.ok ) return res;

        return debianRepository.update( {
            "deleteOutdatedPackages": process.cli.options[ "delete-outdated-packages" ],
        } );
    }
}
