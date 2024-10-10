import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "type": {
                    "description": `Private key type.`,
                    "default": "rsa",
                    "schema": { "enum": [ "rsa", "ec" ] },
                },
                "size": {
                    "description": `RSA key size.`,
                    "default": 4096,
                    "schema": { "type": "integer", "minimum": 2048 },
                },
                "copy": {
                    "description": `copy PEM to the clipboard`,
                    "default": true,
                    "schema": { "type": "boolean" },
                },
                "write": {
                    "description": `write PEM to the "private.key.pem" file`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    // public
    async run () {

        // const pkg = this._findGitPackage();

        // if ( !pkg ) return result( [ 500, `Unable to find root package` ] );

        // await pkg.updateMetadata( { "force": process.cli.options.force } );

        const keyPair = crypto.generateKeyPairSync( process.cli.options.type, {
            "modulusLength": process.cli.options.size,
            "namedCurve": "P-256",
        } );

        const privateKey = keyPair.privateKey.export( {
            "type": "pkcs8",
            "format": "pem",
        } );

        console.log( privateKey );

        if ( process.cli.options.write ) {
            fs.writeFileSync( "private.key.pem", privateKey );
        }

        if ( process.cli.options.copy && process.platform === "win32" ) {
            childProcess.spawnSync( "clip", {
                "input": privateKey,
            } );

            console.log( "Key copied to the clipboard" );
        }
    }
}
