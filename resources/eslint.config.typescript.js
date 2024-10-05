import eslintTypeScript from "typescript-eslint";
import EslintConfig from "./eslint/config.js";

const CONFIG = [
    // typescript:recommended
    ...eslintTypeScript.configs.recommended,
];

export class Config extends EslintConfig {
    // protected
    _wrap(config) {
        return [
            //
            ...super._wrap(config),
            ...CONFIG,
        ];
    }
}

export default new Config().create();
