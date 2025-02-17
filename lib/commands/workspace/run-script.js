import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "sub-packages": {
                    "short": "S",
                    "description": "ignore sub-packages",
                    "default": true,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "script": {
                    "description": `Script name.`,
                    "required": true,
                    "schema": { "type": "string" },
                },
                "pattern": {
                    "description": `Filter packages using patterns.`,
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

        const script = process.cli?.arguments?.script,
            packages = res.data;

        var hasErrors;

        for ( const pkg of packages ) {
            res = pkg.runScript( script, process.cli.argv );

            if ( !res.ok ) hasErrors = true;

            if ( process.cli.options[ "sub-packages" ] ) {
                for ( const subPkg of pkg.subPackages ) {
                    res = subPkg.runScript( script, process.cli.argv );

                    if ( !res.ok ) hasErrors = true;
                }
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
