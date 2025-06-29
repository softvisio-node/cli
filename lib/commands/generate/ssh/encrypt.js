import { pipeline } from "#code/stream";
import { encryptSsh } from "#core/crypto";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "input-encoding": {
                    "description": "Input encoding.",
                    "schema": { "enum": [ "base", "base64url", "hex", "latin1", "utf8" ] },
                },
                "output-encoding": {
                    "description": "Output encoding.",
                    "schema": { "enum": [ "base", "base64url", "hex", "latin1", "utf8" ] },
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

        return new Promise( resolve => pipeline( stream, process.stdout, resolve ) );
    }
}
