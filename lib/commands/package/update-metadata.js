import ansi from "#core/text/ansi";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "force": {
                    "short": "f",
                    "description": `force overwrite metadata`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "dependabot": {
                    "short": "d",
                    "description": `update dependabot config`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "repository": {
                    "short": "r",
                    "description": `configure upstream repository`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "commit": {
                    "short": "C",
                    "description": `do not commit and push changes`,
                    "default": true,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    // public
    async run () {
        const pkg = this._findGitPackage();

        if ( !pkg ) return result( [ 500, `Unable to find root package` ] );

        const res = await pkg.updateMetadata( {
            "commit": process.cli.options.commit,
            "push": process.cli.options.commit,
            "homepage": process.cli.options.force,
            "author": process.cli.options.force,
            "license": process.cli.options.force,
            "dependabot": process.cli.options.dependabot,
            "repository": process.cli.options.repository,
        } );

        console.log( pkg.workspaceSlug + "    ", res.ok
            ? ansi.ok( " " + res.statusText + " " )
            : res.status === 304
                ? " " + res.statusText + " "
                : ansi.error( " " + res.statusText + " " ) );

        if ( res.status === 304 ) {
            return result( 200 );
        }
        else {
            return res;
        }
    }
}
