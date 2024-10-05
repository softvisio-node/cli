import eslintTypeScript from "typescript-eslint";
import EslintConfig from "./eslint/config.js";

const OVERRIDES = [

    // typescript:recommended
    ...eslintTypeScript.configs.recommended,
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
