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
                "pattern": {
                    "summary": `File path or glob pattern. You can pass "-" to read files list from stdin. If not specified "lint" config from the nearest "package.json" will be used.`,
                    "maxItems": false,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    async run () {
        let root, subDir;

        // read consfig from the nearest package.json
        if ( !process.cli.arguments.pattern.length ) {
            root = this._getPackageRoot();

            // package root not found
            if ( !root ) process.exit();

            const pkg = require( root + "/package.json" );

            // package.json has no lint config
            if ( !pkg.lint || !pkg.lint.length ) process.exit();

            process.cli.arguments.pattern = pkg.lint;

            subDir = require( "path" ).relative( root, process.cwd() ).replace( /\\/g, "/" );
        }

        // read from stdin
        else if ( process.cli.arguments.pattern.length === 1 && process.cli.arguments.pattern[0] === "-" ) {
            await this._readStdin();
        }

        const Src = require( "../src" ),
            src = new Src( process.cli.arguments.pattern, {
                "ext": process.cli.options.ext,
                "reportIgnored": process.cli.options["report-ignored"],
                "cwd": root,
                subDir,
            } );

        const res = await src.run( "lint" );

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
                process.cli.arguments.pattern = files.split( "\n" ).filter( file => file !== "" );

                resolve();
            } );

            stdin.setEncoding( "utf8" );
            stdin.resume();
        } );
    }
};
