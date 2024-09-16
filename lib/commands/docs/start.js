import Command from "#lib/command";
import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";

export default class extends Command {
    static cli () {
        return {
            "options": {
                "port": {
                    "short": "p",
                    "description": `Port. Listen on random port by default.`,
                    "schema": { "type": "integer", "format": "ip-port" },
                },
                "open": {
                    "short": "O",
                    "description": "Do not open docs in default browser",
                    "default": true,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    async run () {
        const pkg = this._findPackage();

        if ( !pkg ) return result( [ 500, `Unable to find package` ] );

        if ( !pkg.cliConfig?.docs?.location ) return result( [ 404, "Documentation not found" ] );

        childProcess.spawnSync(
            process.argv[ 0 ],
            [

                //
                fileURLToPath( import.meta.resolve( "docsify-cli/bin/docsify" ) ),
                "serve",
                `--port=${ process.cli.options.port || 0 }`,
                process.cli.options.open
                    ? "--open"
                    : "--no-open",
            ],
            {
                "cwd": pkg.root + pkg.cliConfig.docs.location,
                "stdio": "inherit",
            }
        );
    }
}
