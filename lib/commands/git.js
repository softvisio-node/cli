import Command from "../command.js";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "install-hooks": {
                    "title": "Install GIT hooks",
                    "module": () => new URL( "git/install-hooks.js", import.meta.url ),
                },
                "pre-commit": {
                    "title": "GIT pre-commit hook",
                    "module": () => new URL( "git/pre-commit.js", import.meta.url ),
                },
                "commit-msg": {
                    "title": "GIT commit-msg hook",
                    "module": () => new URL( "git/commit-msg.js", import.meta.url ),
                },
            },
        };
    }
}
