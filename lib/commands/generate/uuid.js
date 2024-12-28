import { copyToClipboard } from "#core/utils";
import uuid from "#core/uuid";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "copy": {
                    "description": `copy UUID to the clipboard`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    // public
    async run () {
        const newUuid = uuid();

        console.log( newUuid );

        if ( process.cli.options.copy ) {
            copyToClipboard( newUuid );

            console.log( "\nUUID copied to the clipboard" );
        }
    }
}
