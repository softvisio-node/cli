import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {
            "commands": {
                "plan": {
                    "title": "get test plan",
                    "module": () => new URL( "./test/plan.js", import.meta.url ),
                },
                "run": {
                    "title": "run tests",
                    "module": () => new URL( "./test/run.js", import.meta.url ),
                },
            },
        };
    }
}
