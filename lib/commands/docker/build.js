import DockerBuilder from "#core/api/docker/builder";
import env from "#core/env";
import { exists } from "#core/fs";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "remove": {
                    "description": "remove images after build and push",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "push": {
                    "description": "do not push images",
                    "default": true,
                    "schema": { "type": "boolean" },
                },
                "yes": {
                    "short": "y",
                    "description": `answer "YES" on all questions`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "compose-file": {
                    "description": `Compose files to build. Default is "compose.yaml".`,
                    "schema": {
                        "type": "array",
                        "items": { "type": "string" },
                        "uniqueItems": true,
                    },
                },
            },
            "arguments": {
                "commit-ref": {
                    "description": `Git commit reference to build. If not specified default tag / branch name or current commit branch name or current commit hash abbrev will be used. Use "." to build current working tree.`,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    // public
    async run () {
        const pkg = this._findGitPackage();

        if ( !pkg ) return result( [ 500, "Unable to find root package" ] );

        const cliConfig = pkg.cliConfig;

        var composeFiles;

        if ( process.cli.options[ "compose-file" ] ) {
            composeFiles = process.cli.options[ "compose-file" ];
        }
        else if ( cliConfig.docker?.composeFile ) {
            composeFiles = cliConfig.docker.composeFile;
        }
        else {
            composeFiles = "compose.yaml";
        }

        if ( !Array.isArray[ composeFiles ] ) composeFiles = [ composeFiles ];

        for ( const composeFile of composeFiles ) {
            if ( !( await exists( pkg.root + "/" + composeFile ) ) ) return result( [ 400, `Compose file "${ composeFile }" not found` ] );
        }

        for ( const composeFile of composeFiles ) {
            const abortController = new AbortController(),
                signal = abortController.signal;

            const builder = new DockerBuilder( pkg.root, {
                composeFile,
                signal,
                "credentials": image => {
                    env.loadUserEnv();

                    return {
                        "ghcr.io": {
                            "username": process.env.GITHUB_USERNAME,
                            "password": process.env.GITHUB_TOKEN,
                        },
                    };
                },
                "commitRef": process.cli.arguments[ "commit-ref" ] || cliConfig.docker?.defaultTag,
                "autoTags": cliConfig.docker?.autoTags,
                "push": process.cli.options.push,
                "remove": process.cli.options.remove,
                "interactive": true,
                "force": process.cli.options.yes,
            } );

            const res = await builder.run();

            if ( !res.ok ) return res;
        }

        return result( 200 );
    }
}
