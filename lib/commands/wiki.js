module.exports = class {
    static cli () {
        return {
            "summary": "Generate documantation.",
        };
    }

    async run () {
        const Doc = require( "@softvisio/core/doc" ),
            fs = require( "fs" ),
            out = "./wiki/docs",
            doc = new Doc( "./lib" ),
            tree = await doc.generate();

        if ( fs.existsSync( "./wiki/docs" ) ) fs.rmdirSync( out, { "recursive": true } );

        tree.write( "./wiki/docs" );
    }
};
