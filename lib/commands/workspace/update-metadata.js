import ansi from "#core/text/ansi";
import ThreadsPoolQueue from "#core/threads/pool/queue";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "force": {
                    "description": `force overwrite metadata`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "dependabot": {
                    "description": `update dependabot config`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "commit": {
                    "short": "C",
                    "description": `do not commit and push`,
                    "default": true,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "pattern": {
                    "description": `filter packages using patterns`,
                    "schema": { "type": "array", "items": { "type": "string" } },
                },
            },
        };
    }

    // public
    async run () {
        var res = this._findWorkspacePackages( {
            "patterns": process.cli.arguments?.pattern,
        } );
        if ( !res.ok ) return res;

        const packages = res.data;

        var length = 0,
            hasErrors;

        // find max. length
        for ( const pkg of packages ) {
            if ( pkg.workspacePath.length > length ) {
                length = pkg.workspacePath.length;
            }
        }

        const threads = new ThreadsPoolQueue( {
            "maxRunningThreads": 10,
        } );

        for ( const pkg of packages ) {
            threads.pushThread( async () => {
                const res = await pkg.updateMetadata( {
                    "commit": process.cli.options.commit,
                    "push": process.cli.options.commit,
                    "homepage": process.cli.options.force,
                    "author": process.cli.options.force,
                    "license": process.cli.options.force,
                    "dependabot": process.cli.options.dependabot,
                } );

                res.data ??= {};
                res.data.pkg = pkg;

                return res;
            } );
        }

        while ( ( res = await threads.getResult() ) ) {
            const pkg = res.data.pkg;

            const isError = !res.ok && res.status !== 304;

            if ( isError ) hasErrors = true;

            console.log( pkg.workspacePath.padEnd( length, " " ) + "    ", res.ok
                ? ansi.ok( " " + res.statusText + " " )
                : res.status === 304
                    ? " " + res.statusText + " "
                    : ansi.error( " " + res.statusText + " " ) );
        }

        if ( hasErrors ) {
            return result( 500 );
        }
        else {
            return result( 200 );
        }
    }
}
