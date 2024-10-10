import Command from "../command.js";

export default class extends Command {

    // static
    static cli () {
        return {
            "commands": {
                "start": {
                    "short": "r",
                    "title": "Start RPC server",
                    "module": () => new URL( "rpc/start.js", import.meta.url ),
                },
                "exit": {
                    "short": "e",
                    "title": "Exit currently running RPC processes",
                    "module": () => new URL( "rpc/exit.js", import.meta.url ),
                },
            },
        };
    }
}
