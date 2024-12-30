import crypto from "node:crypto";
import { copyToClipboard } from "#core/utils";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "type": {
                    "description": `Key type.`,
                    "default": "aes",
                    "schema": { "enum": [ "aes", "hmac" ] },
                },
                "size": {
                    "description": `Key size. If type is "aes", the size must be one of 128, 192, or 256. If type is "hmac", the minimum is 8, and the maximum size is 2**31-1.`,
                    "default": 256,
                    "schema": { "type": "integer", "minimum": 8 },
                },
                "copy": {
                    "description": `copy private key in PEM format to the clipboard`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    // public
    async run () {
        const key = await new Promise( resolve => {
            crypto.generateKey(
                process.cli.options.type,
                {
                    "length": process.cli.options.size,
                },
                ( e, key ) =>
                    resolve( key
                        .export( {
                            "format": "buffer",
                        } )
                        .toString( "base64url" ) )
            );
        } );

        console.log( key.trim() );

        if ( process.cli.options.copy ) {
            copyToClipboard( key );

            console.log( "\nKey copied to the clipboard" );
        }
    }
}
