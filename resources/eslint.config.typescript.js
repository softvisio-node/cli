import eslintCommon from "./eslint.config.common.js";
import eslintTypeScript from "typescript-eslint";

export default [

    // common
    ...eslintCommon,

    // typescript:recommended
    ...eslintTypeScript.configs.recommended,
];
