import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "install-hooks": {
                    "title": "Install Git hooks",
                    "module": () => new URL( "git/install-hooks.js", import.meta.url ),
                },
                "remove-hooks": {
                    "title": "Remove Git hooks",
                    "module": () => new URL( "git/remove-hooks.js", import.meta.url ),
                },
                "pre-commit": {
                    "title": "Git pre-commit hook",
                    "module": () => new URL( "git/pre-commit.js", import.meta.url ),
                },
                "commit-msg": {
                    "title": "Git commit-msg hook",
                    "module": () => new URL( "git/commit-msg.js", import.meta.url ),
                },
            },
        };
    }
}
