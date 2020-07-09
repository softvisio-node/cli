const Command = require( "../command" );

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Lint sources.",
            "description": `Supported file types: javascript, json, vue, html, css, scss, less, xml, yaml, md, sh.

Ignored directories:
  - ".git" directory is always ignored;
  - "node_modules" directory is ignored if it is relative to the current directory;`,
            "options": {
                "ext": {
                    "summary": `Filter files by extension. Example: "--ext *.js".`,
                    "maxItems": false,
                    "schema": { "type": "string" },
                },
                "report-ignored": {
                    "short": "i",
                    "summary": "Show ignored files in report.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "path": {
                    "summary": `File, directory or glob. You can pass "-" to read files list from stdin.`,
                    "minItems": 1,
                    "maxItems": false,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    async run () {

        // read from stdin
        if ( process.cli.arguments.path.length === 1 && process.cli.arguments.path[0] === "-" ) await this._readStdin();

        const Src = require( "../src" ),
            src = new Src( process.cli.arguments.path, {
                "ext": process.cli.options.ext,
                "reportIgnored": process.cli.options["report-ignored"],
            } );

        const res = src.run( "lint" );

        if ( !res.ok ) process.exit( 2 );

        process.exit();
    }

    async _readStdin () {
        return new Promise( resolve => {
            const stdin = process.stdin;

            var files = "";

            stdin.on( "data", data => {
                files += data;
            } );

            stdin.on( "end", () => {
                process.cli.arguments.path = files.split( "\n" ).filter( file => file !== "" );

                resolve();
            } );

            stdin.setEncoding( "utf8" );
            stdin.resume();
        } );
    }
};
