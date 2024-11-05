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
                "api-id": {
                    "description": `Telegram API ID.`,
                    "required": true,
                    "schema": { "type": "integer" },
                },
                "api-hash": {
                    "description": `Telegram API hash.`,
                    "required": true,
                    "schema": { "type": "string" },
                },
                "account-id": {
                    "description": `Telegram account phone number or Telegram bot API token.`,
                    "schema": { "type": "string" },
                },
                "password": {
                    "description": `Telegram account password.`,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    // public
    async run () {
        const res = await new TelegramClient( {
            "apiId": process.cli.arguments[ "api-id" ],
            "apiHash": process.cli.arguments[ "api-hash" ],
        } ).start( {
            "accountId": process.cli.arguments[ "account-id" ],
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
