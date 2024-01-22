import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {
            "commands": {
                "generate": {
                    "title": "generate package from template",
                    "module": () => new URL( "./generate/generate.js", import.meta.url ),
                },
                "update": {
                    "title": "update package metadata",
                    "module": () => new URL( "./generate/update.js", import.meta.url ),
                },
                "private-key": {
                    "title": "Generate private key",
                    "module": () => new URL( "./generate/private-key.js", import.meta.url ),
                },
            },
        };
    }
}
