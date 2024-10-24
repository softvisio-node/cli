import Command from "../command.js";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "update-metadata": {
                    "short": "m",
                    "title": "Update packages metadata",
                    "module": () => new URL( "workspace/update-metadata.js", import.meta.url ),
                },
                "release": {
                    "short": "R",
                    "title": "Release packages",
                    "module": () => new URL( "workspace/release.js", import.meta.url ),
                },
                "run": {
                    "short": "r",
                    "title": "Run package script",
                    "module": () => new URL( "workspace/run.js", import.meta.url ),
                },
                "update-dependencies": {
                    "short": "u",
                    "title": "Update packages outdated dependencies",
                    "module": () => new URL( "workspace/update-dependencies.js", import.meta.url ),
                },
            },
        };
    }
}
