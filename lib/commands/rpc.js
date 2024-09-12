import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {
            "commands": {
                "run": {
                    "short": "r",
                    "title": "Run RPC server",
                    "module": () => new URL( "./rpc/run.js", import.meta.url ),
                },
                "exit": {
                    "short": "e",
                    "title": "Exit currently running RPC processes",
                    "module": () => new URL( "./rpc/exit.js", import.meta.url ),
                },
            },
        };
    }
}
