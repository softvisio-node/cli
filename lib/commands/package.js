import Command from "../command.js";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "publish": {
                    "short": "p",
                    "title": "Release and publish package",
                    "module": () => new URL( "package/publish.js", import.meta.url ),
                },
                "update-localization": {
                    "short": "l",
                    "title": "Update package localization",
                    "module": () => new URL( "package/update-localization.js", import.meta.url ),
                },
                "update-meta": {
                    "short": "m",
                    "title": "Update package metadata",
                    "module": () => new URL( "package/update-meta.js", import.meta.url ),
                },
                "link": {
                    "short": "L",
                    "title": "Link package dependencies",
                    "module": () => new URL( "package/link.js", import.meta.url ),
                },
                "icons": {
                    "title": "Generate icons for cordova project",
                    "module": () => new URL( "package/icons.js", import.meta.url ),
                },
                "open": {
                    "title": "Open project upstream repository",
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
