import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";
import Command from "#lib/command";

// XXX live reload
// <script>
//   document.write('<script src="http://' + (location.host || 'localhost').split(':')[0] +
//   ':35729/livereload.js?snipver=1"></' + 'script>')
// </script>

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "port": {
                    "short": "p",
                    "description": `Port. Listen on random port by default.`,
                    "schema": { "type": "integer", "format": "ip-port" },
                },
                "open": {
                    "short": "O",
                    "description": "Do not open docs in the default browser.",
                    "default": true,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    // public
    async run () {
        const pkg = this._findPackage();

        if ( !pkg ) return result( [ 500, `Unable to find package` ] );

        if ( !pkg.cliConfig?.docs?.location ) return result( [ 404, "Documentation not found" ] );

        const location = pkg.root + pkg.cliConfig.docs.location;

        return new Promise( resolve => {
            const proc = childProcess
                .spawn(
                    process.argv[ 0 ],
                    [

                        //
                        fileURLToPath( import.meta.resolve( "docsify-cli/bin/docsify" ) ),
                        "serve",
                        `--port=${ process.cli.options.port || 0 }`,
                        process.cli.options.open
                            ? "--open"
                            : "--no-open",
                    ],
                    {
                        "cwd": location,
                        "stdio": "inherit",
                    }
                )
                .on( "close", ( code, signal ) => resolve( result( code
                    ? 500
                    : 200 ) ) );

            process.on( "SIGINT", () => proc.kill() );

            // XXX live reload
            // new Server().directory( "/", location );

            // fs.watch(
            //     location,
            //     {
            //         "persistent": true,
            //         "recursive": true,
            //     },
            //     this.#onChange.bind( this )
            // );
        } );
    }
}
