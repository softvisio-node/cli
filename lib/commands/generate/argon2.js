import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "create": {
                    "short": "c",
                    "title": "Create argon2 hash",
                    "module": () => new URL( "argon2/create.js", import.meta.url ),
                },
                "verify": {
                    "short": "v",
                    "title": "Verify argon2 hash",
                    "module": () => new URL( "argon2/verify.js", import.meta.url ),
                },
            },
        };
    }
}
