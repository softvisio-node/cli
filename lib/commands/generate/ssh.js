import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "encrypt": {
                    "short": "e",
                    "title": "Encrypt data with SSH private key",
                    "module": () => new URL( "ssh/encrypt.js", import.meta.url ),
                },
                "decrypt": {
                    "short": "d",
                    "title": "Decrypt data with SSH private key",
                    "module": () => new URL( "ssh/decrypt.js", import.meta.url ),
                },
            },
        };
    }
}
