import { Config as CommonConfig } from "./eslint/common.js";
import eslintTypeScript from "typescript-eslint";

const config = [

    // typescript:recommended
    ...eslintTypeScript.configs.recommended,
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
