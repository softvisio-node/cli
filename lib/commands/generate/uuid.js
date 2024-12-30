import { copyToClipboard } from "#core/utils";
import uuid from "#core/uuid";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "number": {
                    "description": `number of UUIDs to generate`,
                    "default": 1,
                    "schema": { "type": "integer", "minimum": 1 },
                },
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
        var uuids = [];

        for ( let n = 0; n < process.cli.options.number; n++ ) {
            uuids.push( uuid() );
        }

        uuids = uuids.join( "\n" );

        console.log( uuids );

        if ( process.cli.options.copy ) {
            copyToClipboard( uuids );

            console.log( "\nUUIDs copied to the clipboard" );
        }
    }
}
