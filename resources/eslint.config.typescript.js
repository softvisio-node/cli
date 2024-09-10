import configure from "./eslint.config.common.js";
import eslintTypeScript from "typescript-eslint";

const config = [

    // typescript:recommended
    ...eslintTypeScript.configs.recommended,
];

export default configure( ...config );
