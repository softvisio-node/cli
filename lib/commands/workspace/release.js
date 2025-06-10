import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "yes": {
                    "short": "y",
                    "description": `answer "YES" on all questions`,
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
            },
            "arguments": {
                "pattern": {
                    "description": `Filter packages using glob patterns.`,
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
        if ( !res.ok ) throw res;

        const packages = res.data;

        var hasErrors,
            firstPackage = true;

        for ( const pkg of packages ) {
            if ( !pkg.isReleaseEnabled ) continue;

            const release = await pkg.release( {
                "yes": process.cli.options.yes,
            } );

            res = await release.getChangelog();
            if ( !res.ok ) throw res;
            const changelog = res.data;

            // skip if has no changes
            if ( !changelog.hasChanges ) continue;

            if ( firstPackage ) {
                firstPackage = false;
            }
            else {
                console.log( "" );
            }

            res = await release.run();

            console.log( "Released:", res + "" );

            if ( !res.ok ) hasErrors = true;
        }

        if ( hasErrors ) {
            throw result( [ 500, "Some packages wasn't released" ] );
        }
    }
}
