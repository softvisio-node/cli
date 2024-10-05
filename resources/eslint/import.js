import eslintImport from "eslint-plugin-import";

const CONFIG = [
    {
        "name": "import",
        "plugins": {
            "import": eslintImport,
        },
        "settings": {
            "import/parsers": {
                "vue-eslint-parser": [ ".vue" ],
            },
        },
        "rules": {
            "import/no-unresolved": "off",
            "import/named": "error",
            "import/namespace": "error",
            "import/default": "error",
            "import/export": "error",
            "import/no-named-as-default": "error",
            "import/no-named-as-default-member": "error",
            "import/no-duplicates": "error",
            "import/first": "error",
            "import/newline-after-import": "error",

            "import/order": [
                "error",
                {
                    "newlines-between": "ignore",
                    "alphabetize": {
                        "order": "asc",
                        "orderImportKind": "asc",
                        "caseInsensitive": false,
                    },
                },
            ],
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
