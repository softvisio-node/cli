import Command from "../command.js";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "keys": {
                    "title": "Generate keys",
                    "module": () => new URL( "generate/keys.js", import.meta.url ),
                },
                "uuid": {
                    "title": "Generate UUID",
                    "module": () => new URL( "generate/uuid.js", import.meta.url ),
                },
                "telegram-session": {
                    "title": "Create Telegram session",
                    "module": () => new URL( "generate/telegram-session.js", import.meta.url ),
                },
            },
        };
    }
}
