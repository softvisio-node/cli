import Command from "../command.js";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "secret-key": {
                    "title": "Generate secret key for AES or HMAC",
                    "module": () => new URL( "generate/secret-key.js", import.meta.url ),
                },
                "private-key": {
                    "title": "Generate private key",
                    "module": () => new URL( "generate/private-key.js", import.meta.url ),
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
