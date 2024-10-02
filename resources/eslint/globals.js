import globals from "globals";

const CONFIG = [
    {
        "name": "globals",
        "languageOptions": {
            "globals": {
                ...globals.node,
                ...globals.browser,
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
    class extends ( Super || class {} ) {

        // protected
        _wrap ( config ) {
            return [

                //
                ...CONFIG,
                ...super._wrap( config ),
            ];
        }
    };
