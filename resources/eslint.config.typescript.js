import mixins from "#core/mixins";
import EslintConfig from "./eslint/config.js";
import Common from "./eslint/common.js";
import eslintTypeScript from "typescript-eslint";

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
