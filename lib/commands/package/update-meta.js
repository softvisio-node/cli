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
            },
        };
    }

    // public
    async run () {
        const pkg = this._findGitPackage();

        if ( !pkg ) return result( [ 500, `Unable to find root package` ] );

        return pkg.updateMetadata( {
            "commit": true,
            "push": true,
            "homepage": process.cli.options.force,
            "author": process.cli.options.force,
            "license": process.cli.options.force,
            "dependabot": process.cli.options.dependabot,
        } );
    }
}
