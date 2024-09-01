import js from "@eslint/js";
import eslintCommon from "./eslint.config.common.js";
import eslintParser from "./eslint.config.parser.js";

export default [
    // eslint:recommended
    js.configs.recommended,

    // javajscript language options
    eslintParser,

    // common
    ...eslintCommon,
];
