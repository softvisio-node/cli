import eslintPluginComments from "eslint-plugin-eslint-comments";

const CONFIG = [
    // eslint-comments:recommended
    {
        "name": "eslint-comments",
        "plugins": {
            "eslint-comments": eslintPluginComments,
        },
        "rules": {
            ...eslintPluginComments.configs.recommended.rules,
            "eslint-comments/disable-enable-pair": [
                "error",
                {
                    "allowWholeFile": true,
                },
            ],
            "eslint-comments/no-unused-disable": "error",
        },
    },
];

export default Super =>
    class extends Super {

        // protected
        _createConfig () {
            return [

                //
                ...super._createConfig(),
                ...CONFIG,
            ];
        }
    };
