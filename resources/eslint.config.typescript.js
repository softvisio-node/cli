import EslintConfig from "./eslint/config.js";
import Common from "./eslint/common.js";
import eslintTypeScript from "typescript-eslint";

const CONFIG = [

    // typescript:recommended
    ...eslintTypeScript.configs.recommended,
];

export class Config extends Common( EslintConfig ) {

    // public
    wrap ( config ) {
        return [

            //
            ...CONFIG,
            ...super.wrap( config ),
        ];
    }
}

export default new Config().create();
