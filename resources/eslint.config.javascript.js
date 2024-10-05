import EslintConfig from "./eslint/config.js";

const CONFIG = [];

export class Config extends EslintConfig {

    // protected
    _createConfig () {
        return [

            //
            ...super._createConfig(),
            ...CONFIG,
        ];
    }
}

export default new Config().create();
