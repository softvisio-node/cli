const PreCommit = require( "./git/pre-commit" );

module.exports = class {
    static cli () {
        return {
            "summary": "Git tools.",
            "commands": {
                "pre-commit": PreCommit,
            },
        };
    }

    async run () {}
};
