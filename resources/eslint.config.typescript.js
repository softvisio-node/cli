import eslintTypeScript from "typescript-eslint";
import EslintConfig from "./eslint/config.js";

const OVERRIDES = [

    // typescript:recommended
    ...eslintTypeScript.configs.recommended,

    {
        "name": "typescript language options",
        "languageOptions": {
            "parserOptions": {
                "warnOnUnsupportedTypeScriptVersion": false,
            },
        },
    },
];

export class Config extends EslintConfig {

    // protected
    _createOverrides () {
        return [

            //
            ...super._createOverrides(),
            ...OVERRIDES,
        ];
    }
}

export default new Config().create();
