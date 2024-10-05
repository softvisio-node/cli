import EslintConfig from "./eslint/config.js";

const CONFIG = [];

export class Config extends EslintConfig {
    // protected
    _wrap(config) {
        return [
            //
            ...CONFIG,
            ...super._wrap(config),
        ];
    }
}

export default new Config().create();
