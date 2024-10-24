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
                    "title": "Run packages script",
                    "module": () => new URL( "workspace/run.js", import.meta.url ),
                },
                "install": {
                    "short": "i",
                    "title": "Run packages install script",
                    "module": () => new URL( "workspace/install.js", import.meta.url ),
                },
                "update": {
                    "short": "u",
                    "title": "Update packages outdated dependencies",
                    "module": () => new URL( "workspace/update.js", import.meta.url ),
                },
            },
        };
    }
}
