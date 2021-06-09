import Command from "#lib/command";

export default class extends Command {
    static cli () {
        return {
            "summary": "Release and publish the project.",
            "arguments": {
                "release": {
                    "summary": `Release type. Allowed values: "M" or "major", "m" or "minor", "p" or "patch", "n" or "next".`,
                    "minItems": 1,
                    "schema": { "type": "string", "enum": ["M", "major", "m", "minor", "p", "patch", "n", "next"] },
                },
                "pre-release-tag": {
                    "summary": `Pre-release tag. Allowed values: "a" or "alpha", "b" or "beta", "r" or "rc".`,
                    "schema": { "type": "string", "enum": ["a", "alpha", "b", "beta", "r", "rc"] },
                },
            },
        };
    }

    async run () {
        const userConfig = await this._getUserConfig();

        // check user config
        if ( !userConfig.editor ) this._throwError( `Editor is not configured.` );

        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( "Unable to find project root." );

        const res = await rootPackage.publish( process.cli.arguments.release, process.cli.arguments["pre-release-tag"] );

        if ( !res.ok ) this._exitOnError();
    }
}
