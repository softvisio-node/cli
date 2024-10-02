import eslintImportX from "eslint-plugin-import-x";

export default [

    // import-x:recommended
    eslintImportX.flatConfigs.recommended,

    // import-x:custom
    {
        "name": "import-x:custom",
        "settings": {
            "import-x/parsers": {
                "espree": [ ".js", ".cjs", ".mjs", ".jsx" ],
                "vue-eslint-parser": [ ".vue" ],
            },
        },
        "rules": {
            "import-x/no-unresolved": "off",

            // "import-x/order": [
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
