import Command from "../command.js";
import Build from "./docker/build.js";

export default class extends Command {
    static cli () {
        return {
            "title": "Docker tools",
            "commands": {
                "build": Build,
            },
        };
    }
}
