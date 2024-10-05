import eslintImport from "eslint-plugin-import";
import eslintSimpleImportSort from "eslint-plugin-simple-import-sort";

const CONFIG = [
    {
        "name": "import",
        "plugins": {
            "import": eslintImport,
            "simple-import-sort": eslintSimpleImportSort,
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

            "simple-import-sort/imports": [
                "error",
                {
                    "groups": [ [ "^\\u0000", "^node:", "^@?\\w", "^", "^\\." ] ],
                },
            ],
            "simple-import-sort/exports": "error",

            "sort-imports": "off",
            "import/order": "off",
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
