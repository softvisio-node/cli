import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {
            "commands": {
                "build": {
                    "title": "build and push docker image",
                    "module": () => new URL( "./docker/build.js", import.meta.url ),
                },
            },
        };
    }
}
