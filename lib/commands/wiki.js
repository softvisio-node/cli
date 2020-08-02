const Command = require( "../command" );
const Clone = require( "./wiki/clone" );
const Open = require( "./wiki/open" );
const Build = require( "./wiki/build" );

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
