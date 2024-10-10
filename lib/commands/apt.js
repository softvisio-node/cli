import Command from "../command.js";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "build": {
                    "short": "b",
                    "title": "Build apt package",
                    "module": () => new URL( "apt/build.js", import.meta.url ),
                },
                "update": {
                    "title": "Update apt re[psitory",
                    "module": () => new URL( "apt/update.js", import.meta.url ),
                },
                "build-images": {
                    "short": "B",
                    "title": "Build docker images",
                    "module": () => new URL( "apt/build-images.js", import.meta.url ),
                },
            },
        };
    }
}
