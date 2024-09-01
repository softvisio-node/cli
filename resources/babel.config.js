import babelPresetEnv from "@babel/preset-env";
import babelPluginSyntaxImportAssertions from "@babel/plugin-syntax-import-assertions";

export default function ( api ) {
    return {

        // "babelrc": false,
        // "configFile": false,

        "presets": [
            [
                babelPresetEnv,
                {
                    "bugfixes": true,
                    "corejs": 3,
                    "loose": false,
                    "debug": false,
                    "modules": false,
                    "targets": {},
                    "useBuiltIns": "usage",
                    "ignoreBrowserslistConfig": undefined,
                    "exclude": [ "es.array.iterator", "es.promise", "es.object.assign", "es.promise.finally" ],
                    "shippedProposals": true,
                },
            ],
        ],

        "plugins": [

            //
            babelPluginSyntaxImportAssertions,
        ],
    };
}
