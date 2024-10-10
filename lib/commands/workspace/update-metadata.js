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
                    "description": `filter packages using pattern`,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    // public
    async run () {
        var res = this._findWorkspacePackages( {
            "pattern": process.cli.arguments?.pattern,
        } );
        if ( !res.ok ) return res;

        const packages = res.data;

        var hasErrors;

        for ( const pkg of packages ) {
            const res = await pkg.updateMetadata( {
                "commit": process.cli.options.commit,
                "push": process.cli.options.commit,
                "homepage": process.cli.options.force,
                "author": process.cli.options.force,
                "license": process.cli.options.force,
                "dependabot": process.cli.options.dependabot,
            } );

            if ( !res.ok && res.status !== 304 ) hasErrors = true;
        }

        if ( hasErrors ) {
            return result( 500 );
        }
        else {
            return result( 200 );
        }
    }
}
