import Command from "#lib/command";

const PRERELEASE = {
    "a": "alpha",
    "b": "beta",
};

export default class extends Command {
    static cli () {
        return {
            "arguments": {
                "pre-release": {
                    "description": `Pre-release tag. Allowed values:
-   "a" for "alpha"
-   "b" for "beta"
-   "rc" for release candidate
-   "release" to drop pre-release tag`,
                    "schema": { "type": "string", "enum": ["a", "alpha", "b", "beta", "rc", "release"] },
                },
            },
        };
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( "Unable to find project root." );

        // prepeare release type
        const preRelease = PRERELEASE[process.cli.arguments["pre-release"]] || process.cli.arguments["pre-release"];

        const res = await rootPackage.publish( preRelease );

        if ( !res.ok ) this._throwError( res );
    }
}
