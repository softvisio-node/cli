import mixins from "#core/mixins";
import Common from "./eslint/common.js";
import EslintConfig from "./eslint/config.js";

const CONFIG = [];

export class Config extends mixins( Common, EslintConfig ) {

    // protected
    _wrap ( config ) {
        return [

            //
            ...CONFIG,
            ...super._wrap( config ),
        ];
    }
}

export default new Config().create();
