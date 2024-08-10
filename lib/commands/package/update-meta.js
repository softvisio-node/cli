import Command from "#lib/command";

export default class extends Command {
    static cli () {
        return {
            "options": {
                "force": {
                    "description": `force overwrite metadata`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    async run () {
        const pkg = this._findGitPackage();

        if ( !pkg ) return result( [ 500, `Unable to find root package` ] );

        return pkg.updateMetadata( { "force": process.cli.options.force } );
    }
}
