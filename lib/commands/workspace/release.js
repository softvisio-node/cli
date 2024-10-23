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
            if ( !pkg.hasCliConfig ) continue;

            if ( !pkg.isGitPackage ) continue;

            if ( pkg.cliConfig.private ) continue;

            res = await pkg.git.getStatus();
            if ( !res.ok ) return res;

            const status = res.data;

            // no changes since the latest release
            if ( status.currentVersion && !status.currentVersionDistance ) continue;

            res = await pkg.release( {
                "yes": process.cli.options.yes,
            } );

            if ( !res.ok ) hasErrors = true;
        }

        if ( hasErrors ) {
            return result( 500 );
        }
        else {
            return result( 200 );
        }
    }
}