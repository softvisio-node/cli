import EslintConfig from "./eslint/config.js";
import Common from "./eslint/common.js";
import LanguageOptions from "./eslint/language-options.js";

const CONFIG = [];

export class Config extends Common( LanguageOptions( EslintConfig ) ) {

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
