import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {
            "commands": {
                "install-hooks": {
                    "title": "install git hooks",
                    "module": () => new URL( "./git/install-hooks.js", import.meta.url ),
                },
                "pre-commit": {
                    "title": "git pre-commit hook",
                    "module": () => new URL( "./git/pre-commit.js", import.meta.url ),
                },
            },
        };
    }
}
