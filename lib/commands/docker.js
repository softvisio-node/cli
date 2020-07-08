const Build = require( "./docker/build" );

module.exports = class {
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
