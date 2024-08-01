import Command from "#lib/command";
import DockerBuilder from "#core/api/docker/builder";
import env from "#core/env";
import fs from "node:fs";

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
                "force": {
                    "description": `answer "YES" on all questions`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "compose-file": {
                    "description": `Compose file to build. Default is "compose.yaml".`,
                    "schema": {
                        "type": "array",
                        "items": { "type": "string" },
                        "uniqueItems": true,
                    },
                },
            },
            "arguments": {
                "tag": {
                    "description": "git branch, tag or hash. If not specified current branch name will be used",
                    "schema": { "type": "string" },
                },
            },
        };
    }

    // public
    async run () {
        const rootPackage = this._findGitPackage();

        if ( !rootPackage ) this._throwError( "Unable to find root package" );

        const cliConfig = rootPackage.cliConfig;

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
            if ( !fs.existsSync( rootPackage.root + "/" + composeFile ) ) return result( [ 400, `Compose file "${ composeFile }" not found` ] );
        }

        for ( const composeFile of composeFiles ) {
            const abortController = new AbortController(),
                signal = abortController.signal;

            const builder = new DockerBuilder( rootPackage.root, {
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
                "tag": process.cli.arguments.tag || cliConfig.docker?.defaultTag,
                "autoTags": cliConfig.docker?.autoTags,
                "push": process.cli.options.push,
                "remove": process.cli.options.remove,
                "interactive": true,
                "force": process.cli.options.force,
            } );

            const res = await builder.run();

            if ( !res.ok ) return res;
        }

        return result( 200 );
    }
}
