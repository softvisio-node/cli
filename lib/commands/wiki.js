import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {
            "commands": {
                "clone": {
                    "title": "clone wiki",
                    "module": () => new URL( "./wiki/clone.js", import.meta.url ),
                },
                "open": {
                    "title": "open wiki in browser",
                    "module": () => new URL( "./wiki/open.js", import.meta.url ),
                },
            },
        };
    }
}
