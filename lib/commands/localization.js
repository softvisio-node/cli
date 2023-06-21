import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {
            "commands": {
                "gettext": {
                    "title": "extract strings from sources",
                    "module": () => new URL( "./localization/gettext.js", import.meta.url ),
                },
                "update": {
                    "title": "update package .po files",
                    "module": () => new URL( "./localization/updare.js", import.meta.url ),
                },
            },
        };
    }
}
