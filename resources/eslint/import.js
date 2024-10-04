import eslintImport from "eslint-plugin-import";

const CONFIG = [

    // import:recommended
    eslintImport.flatConfigs.recommended,

    // import:custom
    {
        "name": "import:custom",
        "settings": {
            "import/parsers": {

                // "espree": [ ".js", ".cjs", ".mjs", ".jsx" ],
                "vue-eslint-parser": [ ".vue" ],
            },
        },
        "rules": {
            "import/no-unresolved": "off",

            // "import/order": [
            //     "error",
            //     {
            //         "newlines-between": "ignore",
            //         "alphabetize": {
            //             "order": "asc",
            //             "orderImportKind": "asc",
            //             "caseInsensitive": true,
            //         },
            //     },
            // ],
        },
    },
];

export default Super =>
    class extends ( Super || class {} ) {

        // protected
        _wrap ( config ) {
            return [

                //
                ...CONFIG,
                ...super._wrap( config ),
            ];
        }
    };
