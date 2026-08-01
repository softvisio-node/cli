import eslintCorejslib from "@corejslib/eslint-plugin";

const OVERRIDES = [

    // @corejslib:recommended
    eslintCorejslib.configs.recommended,

    // @corejslib:custom
    {
        "name": "@corejslib custom",
        "rules": {
            "@corejslib/camel-case": [
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
