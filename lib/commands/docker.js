const Init = require( "./docker/init" );
const Build = require( "./docker/build" );

module.exports = class {
    static cli () {
        return {
            "summary": "Docker tools.",
            "commands": {
                "init": Init,
                "build": Build,
            },
        };
    }

    async run () {}
};
