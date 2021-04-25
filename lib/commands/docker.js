import Command from "../command.cjs";
import Build from "./docker/build.js";

export default class extends Command {
    static cli () {
        return {
            "summary": "Docker tools.",
            "commands": {
                "build": Build,
            },
        };
    }
}
