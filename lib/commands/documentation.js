import Command from "../command.js";
import Build from "./documentation/build.js";

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
