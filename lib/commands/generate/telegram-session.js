import childProcess from "node:child_process";
import TelegramClient from "#core/api/telegram/client";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "copy": {
                    "description": `copy PEM to the clipboard`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "phone-number": {
                    "description": `phone number`,
                    "schema": { "type": "string" },
                },
                "password": {
                    "description": `password`,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    // public
    async run () {
        const res = await new TelegramClient().start( {
            "phoneNumnber": process.cli.arguments[ "phone-number" ],
            "password": process.cli.arguments[ "password" ],
        } );

        if ( !res.ok ) return res;

        console.log( res.data );

        if ( process.cli.options.copy && process.platform === "win32" ) {
            childProcess.spawnSync( "clip", {
                "input": res.data,
            } );

            console.log( "Session copied to the clipboard" );
        }
    }
}
