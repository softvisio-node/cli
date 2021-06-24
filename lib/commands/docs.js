import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {
            "commands": {
                "init": {
                    "title": "initialize project documentation",
                    "module": () => new URL( "./docs/init.js", import.meta.url ),
                },
                "build": {
                    "title": "generate project documentation",
                    "module": () => new URL( "./docs/build.js", import.meta.url ),
                },
                "open": {
                    "title": "open docs site in browser",
                    "module": () => new URL( "./docs/open.js", import.meta.url ),
                },
            },
        };
    }
}
