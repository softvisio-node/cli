const Command = require( "../command.cjs" );
const PreCommit = require( "./git/pre-commit.cjs" );
const InstallHooks = require( "./git/install-hooks.cjs" );

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Git tools.",
            "commands": {
                "install-hooks": InstallHooks,
                "pre-commit": PreCommit,
            },
        };
    }
};
