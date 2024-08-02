import js from "@eslint/js";
import eslintCommon from "./eslint.config.common.js";
import eslintTypeScript from "typescript-eslint";

export default eslintTypeScript.config(
    // eslint:recommended
    js.configs.recommended,

    // typescript:recommended
    ...eslintTypeScript.configs.recommended,

    // common
    ...eslintCommon
);
