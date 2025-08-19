import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "create": {
                    "short": "c",
                    "title": "Create password hash",
                    "module": () => new URL( "password-hash/create.js", import.meta.url ),
                },
                "verify": {
                    "short": "v",
                    "title": "Verify password hash",
                    "module": () => new URL( "password-hash/verify.js", import.meta.url ),
                },
            },
        };
    }
}
