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
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Unable to find root package` );

        await rootPackage.updateMetadata( { "force": process.cli.options.force } );
    }
}
