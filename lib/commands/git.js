const Command = require( "../command" );
const PreCommit = require( "./git/pre-commit" );

module.exports = class extends Command {
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
