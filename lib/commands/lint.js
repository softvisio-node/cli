import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {
            "summary": "Lint sources.",
            "description": `Supported file types: javascript, typescript, json, vue, html, css, scss, less, xml, yaml, md, sh.

Ignored directories:
  - ".git" directory is always ignored;
  - "node_modules" directory is ignored if it is relative to the current directory;`,
            "options": {
                "verbose": {
                    "short": "v",
                    "summary": "Verbose report.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "report-ignored": {
                    "short": "i",
                    "summary": "Show ignored files in report.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "action": {
                    "short": "a",
                    "summary": `Action. Allowed actions: "lint", "compress", "obfuscate".`,
                    "default": "lint",
                    "schema": { "type": "string", "enum": ["lint", "compress", "obfuscate"] },
                },
            },
            "arguments": {
                "pattern": {
                    "summary": `File path or glob pattern. You can pass "-" to read files list from stdin. If not specified "lint" config from the nearest "package.json" will be used.`,
                    "maxItems": false,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    async run () {
        let patterns = process.cli.arguments.pattern;

        // no input patterns specified, lint all files, starting from the current dir and use package lint config
        if ( !patterns.length ) {
            patterns = ["**"];
        }

        // read patterns from stdin
        else if ( patterns.length === 1 && patterns[0] === "-" ) {
            patterns = await this.#readStdin();
        }

        const { "default": Src } = await import( "../src.js" ),
            src = new Src( patterns, {
                "cwd": "",
                "useLintIgnore": true,
                "verbose": process.cli.options.verbose,
                "reportIgnored": process.cli.options["report-ignored"],
            } );

        const res = await src.run( process.cli.options.action );

        if ( !res.ok ) process.exit( 2 );

        process.exit();
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
