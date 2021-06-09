import Command from "../command.js";
import Clone from "./wiki/clone.js";
import Open from "./wiki/open.js";

export default class extends Command {
    static cli () {
        return {
            "title": "Wiki tools",
            "commands": {
                "clone": Clone,
                "open": Open,
            },
        };
    }
}
