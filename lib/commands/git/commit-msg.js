import Command from "#lib/command";
import fs from "fs";
import { COMMIT_RE } from "#lib/utils";

export default class extends Command {
    static cli () {
        return {
            "arguments": {
                "path": {
                    "description": "path to the commit message",
                    "required": true,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    async run () {
        if ( !this._isRootPackageDir( "." ) ) return;

        const msg = fs.readFileSync( process.cli.arguments.path, "utf8" );

        if ( !COMMIT_RE.test( msg ) ) {
            console.log( `Commit message is invalid. Refer to the documentation: https://softvisio.github.io/cli/#/commit` );

            process.exit( 1 );
        }
    }
}
