import Command from "../command.js";
import Build from "./docs/build.js";

export default class extends Command {
    static cli () {
        return {
            "summary": "Documentation tools.",
            "commands": {
                "build": Build,
            },
        };
    }
}
