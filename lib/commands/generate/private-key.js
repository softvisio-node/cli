import Command from "#lib/command";
import crypto from "node:crypto";
import fs from "node:fs";

export default class extends Command {
    static cli () {
        return {
            "options": {
                "type": {
                    "description": `Private key type. Allowed values: rsa, ec.`,
                    "default": "rsa",
                    "schema": { "type": "string", "enum": ["rsa", "ec"] },
                },
                "size": {
                    "description": `RSA key size.`,
                    "default": 4096,
                    "schema": { "type": "integer", "minimum": 2048 },
                },
                "write": {
                    "description": `write PEM to ".private.key.pem"`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    async run () {

        // const rootPackage = this._findRootPackage();

        // if ( !rootPackage ) this._throwError( `Unable to find root package` );

        // await rootPackage.updateMetadata( { "force": process.cli.options.force } );

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
            fs.writeFileSync( ".private.key.pem", privateKey );
        }
    }
}
