import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
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

        var hasErrors;

        for ( const pkg of packages ) {
            res = pkg.runScript( "install", process.cli.argv );

            if ( !res.ok ) hasErrors = true;

            for ( const subPkg of pkg.subPackages ) {
                res = subPkg.runScript( "install", process.cli.argv );

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
