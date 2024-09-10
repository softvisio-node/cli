import configure from "./eslint.config.common.js";
import eslintLanguageOptions from "./eslint.config.language-options.js";

const config = [

    // language options
    ...eslintLanguageOptions,
];

export default configure( ...config );
