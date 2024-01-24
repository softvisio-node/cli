import Command from "#lib/command";

const PRERELEASE = {
    "a": "alpha",
    "b": "beta",
    "rel": "release",
};

export default class extends Command {
    static cli () {
        return {
            "options": {
                "force": {
                    "description": `answer "YES" on all questions`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "pre-release": {
                    "description": `Pre-release tag. Allowed values:
-   "a", "alpha" for alpha pre-release
-   "b", "beta" for beta pre-release
-   "rc" for release candidate
-   "rel", "release" to drop pre-release tag`,
                    "schema": { "type": "string", "enum": [ "a", "alpha", "b", "beta", "rc", "rel", "release" ] },
                },
            },
        };
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( "Unable to find root package" );

        // prepeare release type
        const preRelease = PRERELEASE[ process.cli.arguments[ "pre-release" ] ] || process.cli.arguments[ "pre-release" ];

        const res = await rootPackage.publish( preRelease, process.cli.options.force );

        if ( !res.ok ) this._throwError( res );
    }
}
