import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {
            "commands": {
                "build": {
                    "title": "build apt package",
                    "module": () => new URL( "./apt/build.js", import.meta.url ),
                },
                "update": {
                    "title": "update apt re[psitory",
                    "module": () => new URL( "./apt/update.js", import.meta.url ),
                },
                "build-base-images": {
                    "short": "B",
                    "title": "update apt re[psitory",
                    "module": () => new URL( "./apt/build-base-images.js", import.meta.url ),
                },
            },
        };
    }
}
