import eslintTypeScript from "typescript-eslint";
import mixins from "#core/mixins";
import Common from "./eslint/common.js";
import EslintConfig from "./eslint/config.js";

const CONFIG = [

    // typescript:recommended
    ...eslintTypeScript.configs.recommended,
];

export class Config extends mixins( Common, EslintConfig ) {

    // protected
    _wrap ( config ) {
        return [

            //
            ...super._wrap( config ),
            ...CONFIG,
        ];
    }
}

export default new Config().create();
