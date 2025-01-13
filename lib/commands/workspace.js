import Command from "../command.js";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "release": {
                    "short": "R",
                    "title": "Release packages",
                    "module": () => new URL( "workspace/release.js", import.meta.url ),
                },
                "run-script": {
                    "short": "r",
                    "title": "Run packages script",
                    "module": () => new URL( "workspace/run-script.js", import.meta.url ),
                },
                "run-command": {
                    "short": "c",
                    "title": "Run command in the packages directory",
                    "module": () => new URL( "workspace/run-command.js", import.meta.url ),
                },
                "install": {
                    "short": "i",
                    "title": "Run packages install script",
                    "module": () => new URL( "workspace/install.js", import.meta.url ),
                },
                "update-dependencies": {
                    "short": "u",
                    "title": "Update packages dependencies",
                    "module": () => new URL( "workspace/update-dependencies.js", import.meta.url ),
                },
                "update-metadata": {
                    "short": "m",
                    "title": "Update packages metadata",
                    "module": () => new URL( "workspace/update-metadata.js", import.meta.url ),
                },
                "update-resources": {
                    "short": false,
                    "title": "Update global resources",
                    "module": () => new URL( "workspace/update-resources.js", import.meta.url ),
                },
            },
        };
    }
}
