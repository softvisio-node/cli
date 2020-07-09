const Command = require( "../command" );
const Build = require( "./docker/build" );

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Docker tools.",
            "commands": {
                "build": Build,
            },
        };
    }

    async run () {}
};
