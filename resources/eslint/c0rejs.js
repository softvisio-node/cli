import eslintSoftvisio from "@c0rejs/eslint-plugin";

const OVERRIDES = [

    // @softvisio:recommended
    eslintSoftvisio.configs.recommended,

    // @softvisio:custom
    {
        "name": "@softvisio custom",
        "rules": {
            "@c0rejs/camel-case": [
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
