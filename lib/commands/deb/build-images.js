import Command from "#lib/command";
import Deb from "#lib/deb";

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

        if ( !root ) return result( [ 500, `Unable to find root package` ] );

        const deb = new Deb( root );

        const res = await deb.checkRepository();
        if ( !res.ok ) return res;

        return deb.buildImages( {
            "codenames": process.cli.options.codename,
        } );
    }
}
