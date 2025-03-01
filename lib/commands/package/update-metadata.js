import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "archived": {
                    "short": "a",
                    "description": `archive repository`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "no-archived": {
                    "short": "A",
                    "description": `unarchive repository`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "repository": {
                    "short": "r",
                    "description": `configure upstream repository`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
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
            "archived": process.cli.options[ "archived" ]
                ? true
                : process.cli.options[ "no-archived" ]
                    ? false
                    : null,
            "repository": process.cli.options.repository,
            "homepage": process.cli.options.force,
            "author": process.cli.options.force,
            "license": process.cli.options.force,
            "dependabot": process.cli.options.dependabot,
            "commit": process.cli.options.commit,
            "log": true,
        } );

        return res;
    }
}
