import childProcess from "node:child_process";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "arguments": {
                "script": {
                    "description": `Script name.`,
                    "required": true,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    // public
    async run () {
        var res = this._findWorkspacePackages();
        if ( !res.ok ) return res;

        const script = process.cli?.arguments?.script,
            packages = res.data;

        var hasErrors;

        for ( const pkg of packages ) {
            if ( pkg.config.scripts?.[ script ] ) {
                const res = childProcess.spawnSync( "npm", [ "run", script ], {
                    "cwd": pkg.root,
                    "stdio": "inherit",
                    "shell": true,
                } );

                if ( res.status ) hasErrors = true;
            }
        }

        if ( hasErrors ) {
            return result( 500 );
        }
        else {
            return result( 200 );
        }
    }
}
