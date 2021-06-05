import Command from "../command.js";
import Init from "./docs/init.js";
import Build from "./docs/build.js";

export default class extends Command {
    static cli () {
        return {
            "summary": "Documentation tools.",
            "commands": {
                "init": Init,
                "build": Build,
            },
        };
    }
}
