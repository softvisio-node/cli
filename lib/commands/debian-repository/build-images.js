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
            },
        };
    }

    // public
    async run () {
        const root = this._findGitPackage()?.root;

        if ( !root ) throw result( [ 500, "Unable to find root package" ] );

        const debianRepository = new DebianRepository( root );

        const res = await debianRepository.checkRepository();
        if ( !res.ok ) throw res;

        return debianRepository.buildImages( {
            "codenames": process.cli.options.codename,
        } );
    }
}
