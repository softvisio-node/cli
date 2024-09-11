import Command from "#lib/command";
import RpcServer from "#lib/rpc/server";

export default class extends Command {

    // static
    static cli () {
        return {
            "description": "Start RPC server on address 127.0.0.1:55555.",

            "options": {
                "daemon": {
                    "short": "d",
                    "description": `run in background`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    // public
    async run () {
        const server = new RpcServer();

        return server.start( {
            "daemon": process.cli.options.daemon,
        } );
    }
}
