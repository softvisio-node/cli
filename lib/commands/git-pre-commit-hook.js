module.exports = class {
    static cli () {
        return {
            "summary": "Git commit hook.",
            "description": "Link supported file types on before git commit. List of files should be passed to the stdin.",
            "options": {
                "report-ignored": {
                    "short": "i",
                    "summary": "Show ignored files in report.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "root": {
                    "summary": "Git root directory.",
                    "minItems": 1,
                    "maxItems": 1,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    async run () {
        const stdin = process.stdin;

        var files = "";

        stdin.on( "data", data => {
            files += data;
        } );

        stdin.on( "end", () => {
            files = files
                .split( "\n" )
                .filter( file => file !== "" )
                .map( file => process.cli.arguments.root + "/" + file );

            const Src = require( "../src" ),
                src = new Src( files, {
                    "reportIgnored": process.cli.options["report-ignored"],
                } );

            const res = src.run( "lint" );

            if ( !res.ok ) {
                console.log( `\nTerminated.` );

                process.exit( 2 );
            }
            else {
                console.log( `\nOK.` );

                process.exit();
            }
        } );

        stdin.setEncoding( "utf8" );
        stdin.resume();
    }
};
