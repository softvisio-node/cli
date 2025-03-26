#!/usr/bin/env node

import Cli from "#core/cli";
import externalResources from "#core/external-resources";

const CLI = {
    "title": "Update resources",
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

await Cli.parse( CLI );

externalResources.add( "softvisio-node/core/resources/prism-js" );

const res = await externalResources.install( {
    "force": process.cli.options.force,
} );

if ( !res.ok ) process.exit( 1 );
