const Command = require( "../command" );
const PreCommit = require( "./git/pre-commit" );
const InstallHooks = require( "./git/install-hooks" );

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Git tools.",
            "commands": {
                "pre-commit": PreCommit,
                "install-hooks": InstallHooks,
            },
        };
    }

    async run () {}
};
