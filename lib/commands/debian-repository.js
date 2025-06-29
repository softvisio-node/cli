import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "build-packages": {
                    "short": "b",
                    "title": "Build Debian packages",
                    "module": () => new URL( "debian-repository/build-packages.js", import.meta.url ),
                },
                "update": {
                    "title": "Update Debian package repository",
                    "module": () => new URL( "debian-repository/update.js", import.meta.url ),
                },
                "build-images": {
                    "short": "B",
                    "title": "Build helper docker images",
                    "module": () => new URL( "debian-repository/build-images.js", import.meta.url ),
                },
            },
        };
    }
}
