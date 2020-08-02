const Command = require( "../../command" );

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Generate project documentation.",
            "options": {
                "commit": {
                    "summary": "Do not commit and push after update.",
                    "default": true,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    async run () {
        const root = this._getProjectRoot();

        if ( !root ) this._throwError( `Unable to find project root.` );

        const Wiki = require( "../../wiki" ),
            wiki = new Wiki( root );

        await wiki.update( !process.cli.options.commit );
    }
};
