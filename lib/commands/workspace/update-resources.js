import path from "node:path";
import { readConfigSync } from "#core/config";
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
                "log": {
                    "description": "print log",
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
                .map( resource => readConfigSync( resource ).id )
                .sort();

        for ( const resource of resources ) {
            externalResources.add( resource );
        }

        const res = await externalResources.autoUpdate( {
            "force": process.cli.options.force,
            "log": process.cli.options.log || null,
        } );

        return res;
    }
}
