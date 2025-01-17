import path from "node:path";
import { readConfig } from "#core/config";
import env from "#core/env";
import externalResources from "#core/external-resources";
import { glob } from "#core/glob";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {
            "options": {
                "force": {
                    "description": "force update",
                    "default": false,
                    "schema": {
                        "type": "boolean",
                    },
                },
            },
        };
    }

    // public
    async run () {

        // path.join( env.getDataDir( "softvisio" ), "external-resources", `${ owner }-${ repo }-${ tag }`, name );
        const location = path.join( env.getDataDir( "softvisio" ), "external-resources" ),
            resources = (
                await glob( "*/*.json", {
                    "cwd": location,
                    "absolute": true,
                } )
            )
                .map( resource => readConfig( resource ).id )
                .sort();

        for ( const resource of resources ) {
            externalResources.add( resource );
        }

        const res = await externalResources.install( {
            "force": process.cli.options.force,
        } );

        return res;
    }
}
