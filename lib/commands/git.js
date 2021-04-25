import Command from "../command.cjs";
import PreCommit from "./git/pre-commit.js";
import InstallHooks from "./git/install-hooks.cjs";

export default class extends Command {
    static cli () {
        return {
            "summary": "Git tools.",
            "commands": {
                "install-hooks": InstallHooks,
                "pre-commit": PreCommit,
            },
        };
    }
}
