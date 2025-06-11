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
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "pre-release-tag": {
                    "description": `Pre-release tag. Allowed values:
-   "alpha" for alpha pre-release
-   "beta" for beta pre-release
-   "rc" for release candidate
-   "stable" to drop pre-release tag and issue stable release
`,
                    "schema": { "enum": [ "alpha", "beta", "rc", "stable" ] },
                },
            },
        };
    }

    // public
    async run () {
        const pkg = this._findGitPackage();
        if ( !pkg ) return result( [ 500, "Unable to find root package" ] );

        const release = await pkg.release( {
            "preReleaseTag": process.cli.arguments[ "pre-release-tag" ],
            "yes": process.cli.options.yes,
        } );

        return release.run();
    }
}
