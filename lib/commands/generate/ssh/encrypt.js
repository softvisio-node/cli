import { encryptSsh } from "#core/crypto";
import { pipeline } from "#core/stream";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "input-encoding": {
                    "description": "Input encoding.",
                    "schema": { "enum": [ "base64", "base64url", "hex" ] },
                },
                "output-encoding": {
                    "description": "Output encoding.",
                    "schema": { "enum": [ "base64", "base64url", "hex" ] },
                },
            },
            "arguments": {
                "github-username": {
                    "description": "GitHub username",
                    "required": true,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    // public
    async run () {
        const stream = await encryptSsh( process.cli.arguments[ "github-username" ], process.stdin, {
            "inputEncoding": process.cli.options[ "input-encoding" ],
            "outputEncoding": process.cli.options[ "output-encoding" ],
        } );

        return new Promise( resolve =>
            pipeline( stream, process.stdout, e => {
                if ( e ) {
                    resolve( result.catch( e, { "log": false } ) );
                }
                else {
                    resolve( result( 200 ) );
                }
            } ) );
    }
}
