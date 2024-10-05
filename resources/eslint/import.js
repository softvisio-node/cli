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
            "import/resolver": {
                "node": true,

                // "webpack": true,
                // "typescript": true,
            },
            "import/parsers": {
                "typescript-eslint/parser": [ ".ts", ".tsx", ".mts", ".cts" ],
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

            // XXX enable, when imports will be supported by resolver
            // "import/no-cycle": [ "error", {
            //     "maxDepth": Infinity,
            //     "allowUnsafeDynamicCyclicDependency": false
            // } ],

            "simple-import-sort/imports": [
                "error",
                {
                    "groups": [ [ "^\\u0000", "^node:", "^@?\\w", "^", "^\\." ] ],
                },
            ],
            "simple-import-sort/exports": "error",
        },
    },
];

const OVERRIDES = [
    {
        "name": "import overrides",
        "rules": {
            "sort-imports": "off",
            "import/order": "off",
        },
    },
];

export default Super =>
    class extends Super {

        // protected
        _createConfig () {
            return [

                //
                ...super._createConfig(),
                ...CONFIG,
            ];
        }

        _createOverrides () {
            return [

                //
                ...super._createOverrides(),
                ...OVERRIDES,
            ];
        }
    };
