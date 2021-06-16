import Command from "../command.js";
import Clone from "./wiki/clone.js";
import Open from "./wiki/open.js";

export default class extends Command {
    static cli () {
        return {
            "title": "wiki tools",
            "commands": {
                "clone": Clone,
                "open": Open,
            },
        };
    }
}
