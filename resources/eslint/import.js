import eslintImport from "eslint-plugin-import";
import eslintSimpleImportSort from "eslint-plugin-simple-import-sort";

// import { fileURLToPath } from "node:url";
// const nodeResolverPath = fileURLToPath( new URL( "import/resolve.cjs", import.meta.url ) );

const CONFIG = [
    {
        "name": "import",
        "plugins": {
            "import": eslintImport,
            "import-sort": eslintSimpleImportSort,
        },
        "settings": {
            "import/resolver": {

                // [ nodeResolverPath ]: {},
                // "node": true,
                // "webpack": true,
                // "typescript": true,
            },
            "import/parsers": {
                "typescript-eslint/parser": [ ".ts", ".tsx", ".mts", ".cts" ],
                "vue-eslint-parser": [ ".vue" ],
            },
        },
        "rules": {
            "import/enforce-node-protocol-usage": [ "error", "always" ],
            "import/export": "error",
            "import/no-named-as-default-member": "error",
            "import/no-duplicates": "error",
            "import/first": "error",
            "import/newline-after-import": "error",

            // "import/no-unresolved": "error",
            // "import/default": "error",
            // "import/no-named-as-default": "error",

            // XXX does not supports re-exports
            "import/namespace": [
                "error",
                {
                    "allowComputed": true,
                },
            ],

            // XXX does not supports re-exporrt
            "import/named": "error",

            "import/no-cycle": [
                "error",
                {
                    "maxDepth": Infinity,
                    "allowUnsafeDynamicCyclicDependency": true,
                },
            ],

            "import-sort/imports": [
                "error",
                {
                    "groups": [ [ "^\\u0000", "^node:", "^@?\\w", "^", "^\\." ] ],
                },
            ],
            "import-sort/exports": "error",
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
