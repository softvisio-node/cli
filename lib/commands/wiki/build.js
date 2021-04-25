import Command from "../../command.js";

export default class extends Command {
    static cli () {
        return {
            "summary": "Generate project documentation.",
            "options": {
                "commit": {
                    "summary": "Do not commit and push after update.",
                    "default": true,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Unable to find project root.` );

        const res = await rootPackage.wiki.update( !process.cli.options.commit );

        if ( !res.ok ) this._exitOnError()();
    }
}
