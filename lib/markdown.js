import Markdown from "#core/markdown";

const MARKDOWN_CODE_LANGUAGES = {
    "javascript": {
        "aliases": [ "js", "mjs", "cjs" ],
        "type": "text/javascript",
    },
    "typescript": {
        "aliases": [ "ts", "tsx", "mts", "cts" ],
        "type": "application/x-typescript",
    },
    "markdown": {
        "aliases": [ "md" ],
        "type": "text/markdown",
    },
    "sh": {
        "aliases": [ "bash", "shell" ],
        "type": "application/x-sh",
    },
    "vue": {
        "aliases": [],
        "type": "application/x-vue",
    },
    "json": {
        "aliases": [],
        "type": "application/json",
    },
    "json5": {
        "aliases": [],
        "type": "application/json5",
    },
    "yaml": {
        "aliases": [ "yml" ],
        "type": "text/yaml",
    },
    "css": {
        "aliases": [],
        "type": "text/css",
    },
    "less": {
        "aliases": [],
        "type": "text/less",
    },
    "scss": {
        "aliases": [],
        "type": "text/x-scss",
    },
    "html": {
        "aliases": [],
        "type": "text/html",
    },
    "xml": {
        "aliases": [],
        "type": "text/xml",
    },
    "batch": {
        "aliases": [ "bat", "cmd" ],
        "type": null,
    },
    "powershell": {
        "aliases": [ "ps1" ],
        "type": null,
    },
    "csv": {
        "aliases": [],
        "type": "text/csv",
    },
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

                for ( const alias of MARKDOWN_CODE_LANGUAGES[ lng ].aliases || [] ) {
                    this.#codeLanguage[ alias ] = MARKDOWN_CODE_LANGUAGES[ lng ];
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
            replaceCodeLanguage = this.getCodeLanguage.bind( this );
        }

        return super.toString( {
            ...options,
            replaceCodeLanguage,
        } );
    }
}
