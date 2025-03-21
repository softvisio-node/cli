import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "clone": {
                    "title": "Clone wiki",
                    "module": () => new URL( "wiki/clone.js", import.meta.url ),
                },
                "open": {
                    "title": "Open wiki in the default browser",
                    "module": () => new URL( "wiki/open.js", import.meta.url ),
                },
            },
        };
    }
}
