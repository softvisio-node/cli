import childProcess from "node:child_process";
import crypto from "node:crypto";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "type": {
                    "description": `Private key type.`,
                    "default": "rsa",
                    "schema": { "enum": [ "rsa", "rsa-pss", "dsa", "ec", "ed25519", "ed448", "x25519", "x448", "dh" ] },
                },
                "size": {
                    "description": `RSA key size (rsa).`,
                    "default": 4096,
                    "schema": { "type": "integer", "minimum": 2048 },
                },
                "ec-name": {
                    "short": "e",
                    "description": `Elliptic curve name (ec).`,
                    "default": "P-256",
                    "schema": { "enum": [ "P-256" ] },
                },
                "prime-length": {
                    "description": `Prime length in bits (dh).`,
                    "default": 2048,
                    "schema": { "type": "integer", "minimum": 2048 },
                },
                "copy": {
                    "description": `copy PEM to the clipboard`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    // public
    async run () {
        const keyPair = crypto.generateKeyPairSync( process.cli.options.type, {
            "modulusLength": process.cli.options.size,
            "namedCurve": process.cli.options[ "ec-name" ],
            "primeLength": process.cli.options[ "prime-length" ],
        } );

        const privateKey = keyPair.privateKey.export( {
            "type": "pkcs8",
            "format": "pem",
        } );

        console.log( privateKey );

        if ( process.cli.options.copy && process.platform === "win32" ) {
            childProcess.spawnSync( "clip", {
                "input": privateKey,
            } );

            console.log( "Private key copied to the clipboard" );
        }
    }
}
