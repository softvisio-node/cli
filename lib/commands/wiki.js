module.exports = class {
    static cli () {
        return {
            "summary": "Generate documentation.",
            "options": {
                "commut": {
                    "summary": "Do not commit and push after build.",
                    "default": true,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    async run () {
        const { throwError, getProjectRoot } = require( "../util" ),
            Wiki = require( "../wiki" );

        const root = getProjectRoot();

        if ( !root ) throwError( `Unable to find project root.` );

        const wiki = new Wiki( root );

        if ( !wiki.getWikiRoot() ) throwError( `Wiki not found.` );
    }
};
