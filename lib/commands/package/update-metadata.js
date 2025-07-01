import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "repository": {
                    "short": "r",
                    "description": `configure upstream repository`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "dependabot": {
                    "negatedShort": "D",
                    "description": `do not update dependabot config`,
                    "default": true,
                    "schema": { "type": "boolean" },
                },
                "commit": {
                    "negatedShort": "C",
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
            "repository": process.cli.options.repository,
            "dependabot": process.cli.options.dependabot,
            "commit": process.cli.options.commit,
            "log": true,
        } );

        return res;
    }
}
