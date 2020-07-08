module.exports = class {
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
                    "summary": "File, directory or glob.",
                    "minItems": 1,
                    "maxItems": false,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    async run () {
        const Src = require( "../src" ),
            src = new Src( process.cli.arguments.path, {
                "ext": process.cli.options.ext,
                "reportIgnored": process.cli.options["report-ignored"],
            } );

        const res = src.run( "lint" );

        if ( !res.ok ) process.exit( 2 );

        process.exit();
    }
};
