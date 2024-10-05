import eslintPluginSoftvisio from "@softvisio/eslint-plugin";

const OVERRIDES = [

    // @softvisio:recommended
    eslintPluginSoftvisio.configs.recommended,

    // @softvisio:custom
    {
        "name": "@softvisio custom",
        "rules": {
            "@softvisio/camel-case": [
                "error",
                {
                    "properties": "never",
                    "ignoreImports": true,
                    "allowConsecutiveCapitalLetters": false,
                    "allowedPrefixes": [ "API_" ],
                },
            ],
        },
    },
];

export default Super =>
    class extends Super {

        // protected
        _createOverrides () {
            return [

                //
                ...super._createOverrides(),
                ...OVERRIDES,
            ];
        }
    };
