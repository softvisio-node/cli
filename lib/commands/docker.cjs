const Command = require( "../command.cjs" );
const Build = require( "./docker/build.cjs" );

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Docker tools.",
            "commands": {
                "build": Build,
            },
        };
    }
};
