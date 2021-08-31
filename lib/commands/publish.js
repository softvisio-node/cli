import Command from "#lib/command";

const RELEASE = {
    "M": "major",
    "m": "minor",
    "p": "patch",
    "n": "next",
};

const RELEASE_TAG = {
    "a": "alpha",
    "b": "beta",
    "r": "rc",
};

export default class extends Command {
    static cli () {
        return {
            "arguments": {
                "release": {
                    "description": `Release type. Allowed values: "M" or "major", "m" or "minor", "p" or "patch", "n" or "next".`,
                    "schema": { "type": "string", "enum": ["M", "major", "m", "minor", "p", "patch", "n", "next"] },
                },
                "pre-release-tag": {
                    "description": `Pre-release tag. Allowed values: "a" or "alpha", "b" or "beta", "r" or "rc".`,
                    "schema": { "type": "string", "enum": ["a", "alpha", "b", "beta", "r", "rc"] },
                },
            },
        };
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( "Unable to find project root." );

        // prepeare release type
        const releaseType = RELEASE[process.cli.arguments.release] || process.cli.arguments.release,
            preReleaseTag = RELEASE_TAG[process.cli.arguments["pre-release-tag"]] || process.cli.arguments["pre-release-tag"];

        const res = await rootPackage.publish( releaseType, preReleaseTag );

        if ( !res.ok ) this._throwError( res );
    }
}
