import Command from "../command.js";
import { lintPatterns } from "#lib/lint";

export default class extends Command {
    static cli () {
        return {
            "description": `Supported file types: javascript, typescript, json, vue, html, css, scss, less, xml, yaml, md, sh.

Ignored directories:
  - ".git" directory is always ignored;
  - "node_modules" directory is ignored if it is relative to the current directory;`,
            "options": {
                "action": {
                    "short": "a",
                    "description": `Action to perform.`,
                    "default": "lint",
                    "schema": { "enum": [ "lint", "format", "compress", "obfuscate" ] },
                },
                "verbose": {
                    "short": "v",
                    "description": "verbose report",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "report-ignored": {
                    "short": "i",
                    "description": "show ignored files in report",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "lintignore": {
                    "short": "I",
                    "description": "do not use .lintignore",
                    "default": true,
                    "schema": { "type": "boolean" },
                },
                "fix": {
                    "short": "F",
                    "description": "do not fix errors",
                    "default": true,
                    "schema": { "type": "boolean" },
                },
                "log": {
                    "short": "L",
                    "description": "do not add errors report",
                    "default": true,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "pattern": {
                    "description": `File path or glob pattern. You can pass "-" to read files list from stdin. If not specified "lint" config from the nearest "package.json" will be used.`,
                    "schema": { "type": "array", "items": { "type": "string" } },
                },
            },
        };
    }

    async run () {
        let patterns = process.cli.arguments.pattern;

        // no input patterns specified, lint all files, starting from the current dir and use package lint config
        if ( !patterns ) {
            patterns = [ "**" ];
        }

        // read patterns from stdin
        else if ( patterns.length === 1 && patterns[ 0 ] === "-" ) {
            patterns = await this.#readStdin();
        }

        return lintPatterns( patterns, {
            "action": process.cli.options.action,
            "cwd": "",
            "useLintIgnore": process.cli.options.lintignore,
            "verbose": process.cli.options.verbose,
            "reportIgnored": process.cli.options[ "report-ignored" ],
            "fix": process.cli.options[ "fix" ],
            "log": process.cli.options[ "log" ],
        } );
    }

    // private
    async #readStdin () {
        return new Promise( resolve => {
            const stdin = process.stdin;

            var files = "";

            stdin.on( "data", data => {
                files += data;
            } );

            stdin.on( "end", () => {
                const patterns = files.split( "\n" ).filter( file => file !== "" );

                resolve( patterns );
            } );

            stdin.setEncoding( "utf8" );
            stdin.resume();
        } );
    }
}
