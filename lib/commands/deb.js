import Command from "../command.js";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "build": {
                    "short": "b",
                    "title": "Build Debian packages",
                    "module": () => new URL( "deb/build-packages.js", import.meta.url ),
                },
                "update": {
                    "title": "Update Debian package repository",
                    "module": () => new URL( "deb/update.js", import.meta.url ),
                },
                "build-images": {
                    "short": "B",
                    "title": "Build helper docker images",
                    "module": () => new URL( "deb/build-images.js", import.meta.url ),
                },
            },
        };
    }
}
