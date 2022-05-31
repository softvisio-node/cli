import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {
            "commands": {
                "gettext": {
                    "title": "extract strings from sources",
                    "module": () => new URL( "./localization/gettext.js", import.meta.url ),
                },
            },
        };
    }
}
