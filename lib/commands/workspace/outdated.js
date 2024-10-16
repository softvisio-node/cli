import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "update": {
                    "description": "update outdated dependencies",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
                "commit": {
                    "short": "C",
                    "description": "do not commit and push changes",
                    "default": true,
                    "schema": {
                        "type": "boolean",
                    },
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

        const script = process.cli?.arguments?.script,
            packages = res.data;

        var hasErrors;

        for ( const pkg of packages ) {
            res = pkg.runScript( script );

            if ( !res.ok ) hasErrors = true;

            for ( const subPkg of pkg.subPackages ) {
                res = subPkg.runScript( script );

                if ( !res.ok ) hasErrors = true;
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
