import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "start": {
                    "short": "s",
                    "title": "Start or restart LSP server",
                    "module": () => new URL( "lsp/start.js", import.meta.url ),
                },
                "exit": {
                    "short": "e",
                    "title": "Exit currently running LSP server",
                    "module": () => new URL( "lsp/exit.js", import.meta.url ),
                },
            },
        };
    }
}
