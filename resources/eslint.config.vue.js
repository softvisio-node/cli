import js from "@eslint/js";
import eslintCommon from "./eslint.config.common.js";
import eslintVue from "eslint-plugin-vue";

export default [
    // eslint:recommended
    js.configs.recommended,

    // vue:recommended
    ...eslintVue.configs[ "flat/recommended" ],

    // common
    ...eslintCommon,
];
