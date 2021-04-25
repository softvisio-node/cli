const Command = require( "../command.cjs" );
const Clone = require( "./wiki/clone.cjs" );
const Open = require( "./wiki/open.cjs" );
const Build = require( "./wiki/build.cjs" );

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Wiki tools.",
            "commands": {
                "clone": Clone,
                "open": Open,
                "build": Build,
            },
        };
    }
};
