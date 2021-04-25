import Command from "../command.js";
import Clone from "./wiki/clone.js";
import Open from "./wiki/open.js";
import Build from "./wiki/build.js";

export default class extends Command {
    static cli () {
        return {
            "summary": "Wiki tools.",
            "commands": {
                "clone": Clone,
                "open": Open,
                "build": Build,
            },
        };
    }
}
