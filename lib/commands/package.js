import Command from "../command.js";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "release": {
                    "short": "R",
                    "title": "Release and publish package",
                    "module": () => new URL( "package/release.js", import.meta.url ),
                },
                "update-dependencies": {
                    "short": "d",
                    "title": "Update package dependencies",
                    "module": () => new URL( "package/update-dependencies.js", import.meta.url ),
                },
                "update-localization": {
                    "short": "l",
                    "title": "Update package localization",
                    "module": () => new URL( "package/update-localization.js", import.meta.url ),
                },
                "update-metadata": {
                    "short": "m",
                    "title": "Update package metadata",
                    "module": () => new URL( "package/update-metadata.js", import.meta.url ),
                },
                "link": {
                    "short": "L",
                    "title": "Link package dependencies",
                    "module": () => new URL( "package/link.js", import.meta.url ),
                },
                "icons": {
                    "title": "Generate icons for Cordova package",
                    "module": () => new URL( "package/icons.js", import.meta.url ),
                },
                "open": {
                    "title": "Open package upstream repository in the default browser",
                    "module": () => new URL( "package/open.js", import.meta.url ),
                },
                "wiki": {
                    "title": "Wiki tools",
                    "module": () => new URL( "package/wiki.js", import.meta.url ),
                },
            },
        };
    }
}
