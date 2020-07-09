const Command = require( "../command" );

module.exports = class extends Command {
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
        const Wiki = require( "../wiki" );

        const root = this._getProjectRoot();

        if ( !root ) this._throwError( `Unable to find project root.` );

        const wiki = new Wiki( root );

        if ( !wiki.getWikiRoot() ) this._throwError( `Wiki not found.` );
    }
};
