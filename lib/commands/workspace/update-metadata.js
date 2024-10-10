import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "force": {
                    "description": `force overwrite metadata`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "dependabot": {
                    "description": `update dependabot config`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "commit": {
                    "short": "C",
                    "description": `do not commit and push`,
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
        } );

        if ( res.status === 304 ) {
            return result( 200 );
        }
        else {
            return res;
        }
    }
}
