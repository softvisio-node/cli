import js from "@eslint/js";
import eslintCommon from "./eslint.config.common.js";
import eslintLanguageOptions from "./eslint.config.language-options.js";

export default [
    // eslint:recommended
    js.configs.recommended,

    // language options
    eslintLanguageOptions,

    // common
    ...eslintCommon,
];
