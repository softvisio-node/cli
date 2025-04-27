import eslintSoftvisio from "@softvisio/eslint-plugin";

const OVERRIDES = [

    // @softvisio:recommended
    eslintSoftvisio.configs.recommended,

    // @softvisio:custom
    {
        "name": "@softvisio custom",
        "rules": {
            "@softvisio/camel-case": [
                "error",
                {
                    "properties": "never",
                    "ignoreImports": true,
                    "strictCamelCase": true,
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
