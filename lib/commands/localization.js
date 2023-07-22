import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {
            "commands": {
                "update": {
                    "title": "update package .po files",
                    "module": () => new URL( "./localization/update.js", import.meta.url ),
                },
            },
        };
    }
}
