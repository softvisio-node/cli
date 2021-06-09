import Command from "../command.js";
import Plan from "./test/plan.js";
import Run from "./test/run.js";

export default class extends Command {
    static cli () {
        return {
            "title": "Test suite",
            "commands": {
                "plan": Plan,
                "run": Run,
            },
        };
    }
}
