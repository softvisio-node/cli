import Command from "../command.cjs";
import Clone from "./wiki/clone.cjs";
import Open from "./wiki/open.cjs";
import Build from "./wiki/build.cjs";

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
