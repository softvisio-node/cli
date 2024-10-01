import { Config as CommonConfig } from "./eslint.config.common.js";
import eslintLanguageOptions from "./eslint.config.language-options.js";

const config = [

    // language options
    ...eslintLanguageOptions,
];

export class Config extends CommonConfig {

    // public
    create ( editorConfig ) {
        return super.create( {
            config,
            editorConfig,
        } );
    }

    customize ( editorConfig ) {
        const config = super.customize( editorConfig );

        return config;
    }
}

export default new Config().create();
