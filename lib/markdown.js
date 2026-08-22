import Markdown from "#core/markdown";

const MARKDOWN_CODE_LANGUAGES = {
    "batch": { "aliases": [ "bat", "cmd" ], "type": null },
    "css": { "aliases": [], "type": "text/css" },
    "csv": { "aliases": [], "type": "text/csv" },
    "html": { "aliases": [], "type": "text/html" },
    "javascript": { "aliases": [ "js", "mjs", "cjs" ], "type": "text/javascript" },
    "json": { "aliases": [], "type": "application/json" },
    "json5": { "aliases": [], "type": "application/json5" },
    "less": { "aliases": [], "type": "text/less" },
    "markdown": { "aliases": [ "md" ], "type": "text/markdown" },
    "nginx": { "aliases": [], "type": null },
    "perl": { "aliases": [ "pl", "pm" ], "type": null },
    "powershell": { "aliases": [ "ps1", "psh" ], "type": null },
    "python": { "aliases": [ "py" ], "type": null },
    "scss": { "aliases": [], "type": "text/x-scss" },
    "sh": { "aliases": [ "bash", "shell" ], "type": "application/x-sh" },
    "sql": { "aliases": [], "type": null },
    "toml": { "aliases": [], "type": null },
    "typescript": { "aliases": [ "ts", "tsx", "mts", "cts" ], "type": "application/x-typescript" },
    "vue": { "aliases": [], "type": "application/x-vue" },
    "xml": { "aliases": [], "type": "text/xml" },
    "yaml": { "aliases": [ "yml" ], "type": "text/yaml" },
};

export default class extends Markdown {
    static #codeLanguage;

    // static
    static getCodeLanguage ( language ) {
        if ( !this.#codeLanguage ) {
            this.#codeLanguage = {};

            for ( const lng in MARKDOWN_CODE_LANGUAGES ) {
                MARKDOWN_CODE_LANGUAGES[ lng ].language = lng;

                this.#codeLanguage[ lng ] = MARKDOWN_CODE_LANGUAGES[ lng ];

                if ( MARKDOWN_CODE_LANGUAGES[ lng ].aliases ) {
                    for ( const alias of MARKDOWN_CODE_LANGUAGES[ lng ].aliases ) {
                        this.#codeLanguage[ alias ] = MARKDOWN_CODE_LANGUAGES[ lng ];
                    }
                }
            }
        }

        return this.#codeLanguage[ language ];
    }

    // public
    getCodeLanguage ( language ) {
        return this.constructor.getCodeLanguage( language );
    }

    toString ( { replaceCodeLanguage, ...options } = {} ) {
        if ( replaceCodeLanguage ) {
            replaceCodeLanguage = language => this.getCodeLanguage( language )?.language;
        }

        return super.toString( {
            ...options,
            replaceCodeLanguage,
        } );
    }
}
