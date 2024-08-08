import Command from "#lib/command";

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
-   "alpha" for alpha pre-release
-   "beta" for beta pre-release
-   "rc" for release candidate
-   "release" to drop pre-release tag`,
                    "schema": { "type": "string", "enum": [ "alpha", "beta", "rc", "release" ] },
                },
            },
        };
    }

    async run () {
        const rootPackage = this._findGitPackage();

        if ( !rootPackage ) return result( [ 500, "Unable to find root package" ] );

        return rootPackage.publish( process.cli.arguments[ "pre-release" ], process.cli.options.force );
    }
}
