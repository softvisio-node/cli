import ansi from "#core/text/ansi";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "unarchive": {
                    "short": "u",
                    "description": `unarchive package`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    // public
    async run () {
        const pkg = this._findGitPackage();

        if ( !pkg ) return result( [ 500, `Unable to find root package` ] );

        const res = await pkg.archive( {
            "unarchive": process.cli.options[ "unarchive" ],
        } );

        console.log( "Set archived status: " + ( res.ok
            ? ( res.data.updated
                ? ansi.ok( " Updated " )
                : "Not modified" )
            : ansi.error( " " + res.statusText + " " ) ) );

        return res;
    }
}
