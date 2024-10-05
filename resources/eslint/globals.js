import globals from "globals";

const CONFIG = [
    {
        "name": "globals",
        "languageOptions": {
            "globals": {
                ...globals.node,
                ...globals.browser,

                // custom
                "Ext": "readonly",
                "l10n": "readonly",
                "l10nt": "readonly",
                "msgid": "readonly",
                "result": "readonly",
                "Temporal": "readonly",
            },
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
