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
                "github": {
                    "short": "g",
                    "description": `Setup repository on GitHub`,
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
            "github": process.cli.options.github,
        } );

        if ( res.status === 304 ) {
            return result( 200 );
        }
        else {
            return res;
        }
    }
}
