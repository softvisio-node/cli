import baseConfig from "./.eslint.config.javascript.js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    ...baseConfig,

    // ...tseslint.configs.recommended,
    ...tseslint.configs.strict,
    ...tseslint.configs.stylistic
);
