import Command from "../command.js";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "build": {
                    "short": "b",
                    "title": "Build deb package",
                    "module": () => new URL( "deb/build.js", import.meta.url ),
                },
                "update": {
                    "title": "Update deb re[psitory",
                    "module": () => new URL( "deb/update.js", import.meta.url ),
                },
                "build-images": {
                    "short": "B",
                    "title": "Build docker images",
                    "module": () => new URL( "deb/build-images.js", import.meta.url ),
                },
            },
        };
    }
}
