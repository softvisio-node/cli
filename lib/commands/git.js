import Command from "../command.js";
import PreCommit from "./git/pre-commit.js";
import InstallHooks from "./git/install-hooks.js";

export default class extends Command {
    static cli () {
        return {
            "title": "git tools",
            "commands": {
                "install-hooks": InstallHooks,
                "pre-commit": PreCommit,
            },
        };
    }
}
