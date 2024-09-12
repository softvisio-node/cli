import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {
            "commands": {
                "init": {
                    "title": "Initialize project documentation",
                    "module": () => new URL( "docs/init.js", import.meta.url ),
                },
                "build": {
                    "title": "Build project documentation",
                    "module": () => new URL( "docs/build.js", import.meta.url ),
                },
                "open": {
                    "title": "Open docs in the browser",
                    "module": () => new URL( "docs/open.js", import.meta.url ),
                },
            },
        };
    }
}
