import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {
            "commands": {
                "keys": {
                    "title": "Generate keys",
                    "module": () => new URL( "generate/keys.js", import.meta.url ),
                },
            },
        };
    }
}
