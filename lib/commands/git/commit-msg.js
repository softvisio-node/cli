import Command from "#lib/command";
import fs from "fs";

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

        if ( !/^(?:chore|docs|feat|fix|refactor|style|test)(?:\(.+\))?!?: .{1,50}\n/.test( msg ) ) {
            console.log( `Commit message is invalid. Refer to the documentation: https://softvisio.github.io/cli/#/commit` );

            process.exit( 1 );
        }
    }
}
