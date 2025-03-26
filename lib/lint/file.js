import fs from "node:fs";
import path from "node:path";
import PrettierPluginXml from "@prettier/plugin-xml";
import editorconfig from "editorconfig";
import { ESLint as EsLint } from "eslint";
import prettier from "prettier";
import PrettierPluginPackageJson from "prettier-plugin-packagejson";
import PrettierPluginSh from "prettier-plugin-sh";
import File from "#core/file";
import json5 from "#core/json5";
import mime from "#core/mime";
import ansi from "#core/text/ansi";
import Table from "#core/text/table";
import * as utils from "#core/utils";
import uuid from "#core/uuid";
import Markdown from "#lib/markdown";

// Status codes:
// 200 - OK
// 201 - File Ignored
// 210 - Warnings
// 400 - Errors
// 500 - Fatal error

var terser, postcss, cssnano, htmlMinifier;

const customMime = mime.clone();

customMime.get( "application/json" ).extnames.add( [

    //
    ".gyp",
] );

customMime.get( "application/x-sh" ).shebangs.add( [

    //
    "#!/bin/sh",
    "#!/bin/bash",
    "#!/usr/bin/sh",
    "#!/usr/bin/bash",
    "#!/usr/bin/env sh",
    "#!/usr/bin/env bash",
] );

customMime.get( "application/node" ).shebangs.add( [

    //
    "#!/usr/bin/env node",
] );

customMime.get( "application/x-sh" ).filenames.add( [

    //
    ".gitignore",
    ".dockerignore",
    ".lintignore",
] );

// NOTE ".ts" conflicts with "video/mp2t"
customMime.add( {
    "essence": "application/x-typescript",
    "compressible": true,
    "extnames": [ ".ts", ".tsx", ".mts", ".cts" ],
} );

customMime.add( {
    "essence": "application/x-vue",
    "compressible": true,
    "extnames": [ ".vue" ],
} );

customMime.add( {
    "essence": "text/x-vim",
    "compressible": true,
    "extnames": [ ".vim" ],
} );

const DEFAULT_ESLINT_CONFIG_JAVASCRIPT = import.meta.resolve( "#resources/eslint.config.javascript.js" ),
    DEFAULT_ESLINT_CONFIG_VUE = import.meta.resolve( "#resources/eslint.config.vue.js" ),
    DEFAULT_ESLINT_CONFIG_TYPESCRIPT = import.meta.resolve( "#resources/eslint.config.typescript.js" );

const USE_PRETTIER_FOR_JS = true,
    TYPES = {
        "text/javascript": {
            "prettier": {
                "parser": USE_PRETTIER_FOR_JS
                    ? "babel"
                    : null,
            },
            "eslint": {
                "config": DEFAULT_ESLINT_CONFIG_JAVASCRIPT,
            },
            "terser": true,
        },
        "application/node": {
            "prettier": {
                "parser": USE_PRETTIER_FOR_JS
                    ? "babel"
                    : null,
            },
            "eslint": {
                "config": DEFAULT_ESLINT_CONFIG_JAVASCRIPT,
            },
            "terser": true,
        },
        "application/x-typescript": {
            "prettier": {
                "parser": USE_PRETTIER_FOR_JS
                    ? "typescript"
                    : null,
            },
            "eslint": {
                "config": DEFAULT_ESLINT_CONFIG_TYPESCRIPT,
            },
            "terser": false,
        },
        "application/x-vue": {
            "prettier": {
                "parser": USE_PRETTIER_FOR_JS
                    ? "vue"
                    : null,
            },
            "eslint": {
                "config": DEFAULT_ESLINT_CONFIG_VUE,
            },
        },
        "application/json": {
            "prettier": {
                "parser": "json-stringify",
            },
            "json": true,
        },
        "application/json5": {
            "prettier": {
                "parser": "jsonc",
            },
            "json": true,
        },
        "text/yaml": {
            "prettier": {
                "parser": "yaml",
            },
        },
        "text/css": {
            "prettier": {
                "parser": "css",
            },
            "cssnano": true,
        },
        "text/x-scss": {
            "prettier": {
                "parser": "scss",
            },
        },
        "text/less": {
            "prettier": {
                "parser": "less",
            },
        },
        "text/markdown": {
            "prettier": {
                "parser": "markdown",
            },
        },
        "text/html": {
            "prettier": {
                "parser": "html",
            },
            "html": true,
        },
        "application/x-sh": {
            "prettier": {
                "parser": "sh",
            },
        },
        "text/xml": {
            "prettier": {
                "parser": "xml",
            },
        },
        "application/wsdl+xml": {
            "prettier": {
                "parser": "xml",
            },
        },
        "image/svg+xml": {
            "prettier": {
                "parser": "xml",
            },
        },
        "text/x-lua": {},
        "text/x-vim": {},
    };

// prepare types
for ( const [ type, spec ] of Object.entries( TYPES ) ) {
    spec.type = type;
}

const RESOURCES_ROOT = path.dirname( utils.resolve( "#resources/.prettierrc.yaml", import.meta.url ) );

const DEFAULT_PRETTIER_CONFIG = await prettier.resolveConfig( "fake-config", {
    "editorconfig": false,
    "config": RESOURCES_ROOT + "/.prettierrc.yaml",
} );

// NOTE https://eslint.org/docs/latest/integrate/nodejs-api#parameters
const ESLINT_OPTIONS = {

    // files
    "cwd": undefined,

    // lint
    "allowInlineConfig": true,
    "stats": false,

    // cache
    "cache": false,
    "cacheLocation": undefined,
    "cacheStrategy": "metadata",
};

const CSSNANO_PRESETS = {
    "compress": [
        "default",
        {
            "discardComments": {
                "removeAll": true,
            },
        },
    ],

    "obfuscate": [
        "default",
        {
            "discardComments": {
                "removeAll": true,
            },
        },
    ],
};

const POSTCSS_CACHE = {};

const EOL = {
    "cr": "\r",
    "lf": "\n",
    "crlf": "\r\n",
};

export class LintFile {
    #file;
    #processUnsupportedTypes;
    #write;
    #cache;
    #fix;
    #log;

    #cwd;
    #path;
    #fullPath;
    #useDefaults;
    #originalData;
    #data;
    #type;

    constructor ( file, { type, cwd, processUnsupportedTypes, write, fix = true, log = true, cache } = {} ) {
        this.#file = File.new( file );
        this.#type = type;
        this.#cwd = cwd;
        this.#processUnsupportedTypes = Boolean( processUnsupportedTypes );
        this.#write = Boolean( write );
        this.#cache = cache || {};
        this.#fix = Boolean( fix );
        this.#log = Boolean( log );
    }

    // public
    async run ( action ) {
        if ( !this.#file.path ) {
            return result( [ 500, "File path is required" ] );
        }

        if ( path.isAbsolute( this.#file.path ) ) {
            this.#path = path.normalize( this.#file.path );
        }
        else {
            if ( !this.#cwd ) {
                return result( [ 500, "Cwd is required when file path is relative" ] );
            }

            this.#path = path.normalize( path.join( this.#cwd, this.#file.path ) );
        }

        this.#cwd = path.dirname( this.#path );

        if ( this.#write && !this.#path ) {
            return result( [ 500, "File path is required to write content" ] );
        }

        this.#fullPath = this.#path;

        // detect type
        {
            let type = this.#type;

            type ||= customMime.findByFilename( this.#fullPath )?.essence;

            type ||= (
                await customMime.findByShebang( {
                    "path": this.#fullPath,
                    "content": await this.#file.slice( 0, 50 ).text( "latin1" ),
                } )
            )?.essence;

            type ||= this.#file.type;

            this.#type = TYPES[ type ];
        }

        // file type is not supported
        if ( !this.#type && !this.#processUnsupportedTypes ) {
            return result( [ 201, "File ignored" ], null, {
                "isIgnored": true,
            } );
        }

        // read file content
        this.#originalData = this.#data = await this.#file.text( "utf8" );

        // add default extension
        if ( this.#type ) {
            const extnames = customMime.get( this.#type.type )?.extnames;

            if ( extnames?.default && !extnames.has( path.extname( this.#path ) ) ) {
                this.#fullPath += extnames.default;
            }
        }

        let res;

        if ( action === "lint" ) res = await this.#lint();
        else if ( action === "format" ) res = await this.#format();
        else if ( action === "compress" ) res = await this.#compress();
        else if ( action === "obfuscate" ) res = await this.#obfuscate();

        res.meta.type = this.#type?.type;
        res.meta.isIgnored = false;

        if ( res.status >= 500 ) return res;

        // data was modified
        if ( this.#data !== this.#originalData ) {
            res.meta.isModified = true;
            res.meta.bytesDelta = this.#data.length - this.#originalData.length;

            if ( this.#write ) {
                await fs.promises.writeFile( this.#path, this.#data );
            }
        }
        else {
            res.meta.isModified = false;
            res.meta.bytesDelta = 0;
        }

        res.data = this.#data;

        return res;
    }

    // private
    async #lint () {
        const configs = await this.#getConfigs( this.#cwd ),
            editorConfig = await this.#getEditorConfig( {
                "fallbackToDefault": configs.package
                    ? Boolean( configs.cli )
                    : true,
            } );

        var res;

        // markdown
        if ( this.#type?.type === "text/markdown" ) {
            res = await this.#lintMarkdown( {
                configs,
                editorConfig,
            } );

            if ( !res.ok ) return res;
        }

        // prettier
        else {
            res = await this.#runPrettier( {
                configs,
                editorConfig,
            } );

            if ( !res.ok ) return res;
        }

        // eslint
        res = await this.#runEslint( {
            configs,
            editorConfig,
        } );
        if ( res.status >= 500 ) return res;

        // apply editor config
        if ( editorConfig ) {

            // replace tabs
            if ( editorConfig.indent_style === "space" ) {
                this.#replaceTabs( editorConfig.tab_width );
            }

            let eol = editorConfig.end_of_line;

            // detect EOL
            if ( !eol ) {
                if ( this.#data.includes( "\r\n" ) ) {
                    eol = "crlf";
                }
                else if ( this.#data.includes( "\r" ) ) {
                    eol = "cr";
                }
                else if ( this.#data.includes( "\n" ) ) {
                    eol = "lf";
                }
            }

            if ( eol ) {

                // replace EOL
                this.#replaceEndOfLine( eol );

                // trim trailing whitespaces
                if ( editorConfig.trim_trailing_whitespace ) {
                    this.#data = this.#data.replaceAll( new RegExp( ` +${ EOL[ eol ] }`, "g" ), EOL[ eol ] );

                    // trim
                    this.#data = this.#data.trim();
                }

                // insert final new line
                if ( editorConfig.insert_final_newline && !this.#data.endsWith( EOL[ eol ] ) ) {
                    this.#data += EOL[ eol ];
                }
            }
        }

        return res;
    }

    async #format () {
        this.#useDefaults = true;

        return this.#lint();
    }

    async #compress () {
        if ( this.#type ) {
            if ( this.#type.terser ) {
                return await this.#runTerser( {
                    "compress": true,
                    "mangle": false,
                } );
            }
            else if ( this.#type.cssnano ) {
                return this.#runCssnano( "compress" );
            }
            else if ( this.#type.json ) {
                return this.#runJson( "compress" );
            }
            else if ( this.#type.html ) {
                return this.#runHtmlMinifier( {
                    "cleanCssOptions": {
                        "level": 1,
                    },
                    "terserOptions": {
                        "compress": true,
                        "mangle": false,
                    },
                } );
            }
        }

        return result( 200 );
    }

    async #obfuscate () {
        if ( this.#type ) {
            if ( this.#type.terser ) {
                return await this.#runTerser( {
                    "compress": true,
                    "mangle": true,
                } );
            }
            else if ( this.#type.cssnano ) {
                return this.#runCssnano( "obfuscate" );
            }
            else if ( this.#type.json ) {
                return this.#runJson( "obfuscate" );
            }
            else if ( this.#type.html ) {
                return this.#runHtmlMinifier( {
                    "cleanCssOptions": {
                        "level": 2,
                    },
                    "terserOptions": {
                        "compress": true,
                        "mangle": true,
                    },
                } );
            }
        }

        return result( 200 );
    }

    async #runPrettier ( { configs, editorConfig } ) {
        if ( !this.#type?.prettier?.parser ) return result( 200 );

        let prettierConfig;

        // default prettier config
        if ( this.#useDefaults ) {
            prettierConfig = DEFAULT_PRETTIER_CONFIG;
        }

        // custom prettier config
        else if ( configs.prettier ) {
            this.#cache.prettierConfigs ||= {};

            if ( !this.#cache.prettierConfigs[ configs.prettier ] ) {
                this.#cache.prettierConfigs[ configs.prettier ] = await prettier.resolveConfig( this.#path, {
                    "config": configs.prettier,
                    "editorconfig": false,
                } );
            }

            prettierConfig = this.#cache.prettierConfigs[ configs.prettier ];
        }

        // not a package
        else if ( !configs.package ) {
            prettierConfig = DEFAULT_PRETTIER_CONFIG;
        }

        // package controlled by cli config
        else if ( configs.cli ) {
            prettierConfig = DEFAULT_PRETTIER_CONFIG;
        }

        if ( !prettierConfig ) return result( 200 );

        prettierConfig = { ...prettierConfig };

        prettierConfig.plugins ??= [];
        prettierConfig.plugins.push( PrettierPluginSh, PrettierPluginPackageJson, PrettierPluginXml );
        prettierConfig.parser = this.#type.prettier.parser;
        prettierConfig.filepath = this.#fullPath;

        // merge prettier config with editor config
        if ( editorConfig ) {
            prettierConfig.useTabs ??= editorConfig.indent_style === "tab";
            prettierConfig.tabWidth ??= editorConfig.tab_width;
            prettierConfig.printWidth ??= editorConfig.max_line_length === "off"
                ? Infinity
                : editorConfig.max_line_length;
            prettierConfig.endOfLine ??= editorConfig.end_of_line;
        }

        // run prettier
        try {

            // pre-parse package.json
            if ( path.basename( this.#path ) === "package.json" ) {
                const res = this.#runJson( "compress" );

                if ( !res.ok ) return res;
            }

            this.#data = await prettier.format( this.#data, prettierConfig );

            return result( 200 );
        }
        catch ( e ) {
            return result( [ 500, ansi.remove( e.message ) ] );
        }
    }

    async #runEslint ( { configs, editorConfig, fatalError } ) {
        if ( !this.#type?.eslint ) return result( 200 );

        const fullPath = this.#fullPath;

        var eslintConfig;

        // default eslint config
        if ( this.#useDefaults ) {
            eslintConfig = true;
        }

        // custom eslint config
        else if ( configs.eslint ) {
            eslintConfig = configs.eslint;
        }

        // not a package
        else if ( !configs.package ) {
            eslintConfig = true;
        }

        // package controlled by cli
        else if ( configs.cli ) {
            eslintConfig = true;
        }

        if ( !eslintConfig ) return result( 200 );

        const options = {
            ...ESLINT_OPTIONS,
            "fix": this.#fix,
        };

        // use default config
        if ( eslintConfig === true ) {
            options.cwd = path.dirname( fullPath );

            options.overrideConfigFile = true;

            const { Config } = await import( this.#type.eslint.config );

            options.overrideConfig = new Config().create( editorConfig );
        }

        // use custom config
        else {
            options.cwd = path.dirname( eslintConfig );

            options.overrideConfigFile = eslintConfig;
        }

        const eslint = new EsLint( options );

        // file ignored by eslint
        const ignored = await eslint.isPathIgnored( fullPath );
        if ( ignored ) return result( 200 );

        // NOTE https://eslint.org/docs/latest/integrate/nodejs-api#-eslintlinttextcode-options
        const report = await eslint.lintText( this.#data, {
            "filePath": fullPath,
            "warnIgnored": true,
        } );

        // fatal error
        if ( !fatalError && report[ 0 ].output == null ) {

            // repeat with the original data
            this.#data = this.#originalData;

            return this.#runEslint( { configs, editorConfig, "fatalError": true } );
        }
        else if ( report[ 0 ].output != null ) {
            this.#data = report[ 0 ].output;
        }

        // append log
        var log = "",
            hasWarnings,
            hasErrors;

        const table = new Table( {
            "width": 100,
            "columns": {
                "severity": { "title": "Severity", "width": 10, "margin": [ 1, 0 ] },
                "line": { "title": "Line", "width": 10, "align": "end", "margin": [ 0, 1 ] },
                "description": { "title": "Desctiption", "margin": [ 1, 0 ] },
            },
        } );

        for ( const msg of report[ 0 ].messages.sort( ( a, b ) => b.severity - a.severity || a.line - b.line || a.column - b.column ) ) {
            let severity;

            if ( msg.severity === 1 ) {
                hasWarnings = true;

                severity = "WARN";
            }
            else {
                hasErrors = true;

                severity = "ERROR";
            }

            table.add( {
                severity,
                "line": `${ msg.line }:${ msg.column }`,
                "description": msg.ruleId + ", " + msg.message,
            } );
        }

        table.end();

        log = table.content;

        // vue
        if ( this.#type.type === "application/x-vue" ) {
            this.#data = this.#data.replace( /^\s*<!-{2} -{5} SOURCE FILTER LOG BEGIN -{5}[\S\s]+?-{5} SOURCE FILTER LOG END -{5} -{2}>/m, "" );

            this.#data = this.#data.trim();

            if ( this.#log && log ) {
                log = log.trim().replaceAll( "-->", "---" ).replaceAll( /^/gm, "<!-- " ).replaceAll( /$/gm, " -->" );

                this.#data += "\n\n<!-- ----- SOURCE FILTER LOG BEGIN ----- -->\n";
                this.#data += "<!-- -->\n";
                this.#data += log + "\n";
                this.#data += "<!-- -->\n";
                this.#data += "<!-- ----- SOURCE FILTER LOG END ----- -->";
            }
        }

        // javascript
        else {
            this.#data = this.#data.replace( /^\s*\/{2} -{5} SOURCE FILTER LOG BEGIN -{5}[\S\s]+?-{5} SOURCE FILTER LOG END -{5}/m, "" );

            this.#data = this.#data.trim();

            if ( this.#log && log ) {
                log = log.trim().replaceAll( /^/gm, "// " );

                this.#data += "\n\n// ----- SOURCE FILTER LOG BEGIN -----\n";
                this.#data += "//\n";
                this.#data += log + "\n";
                this.#data += "//\n";
                this.#data += "// ----- SOURCE FILTER LOG END -----";
            }
        }

        // errors
        if ( hasErrors ) {
            return result( [ 400, "Errors" ] );
        }

        // warnings
        else if ( hasWarnings ) {
            return result( [ 210, "Warnings" ] );
        }

        // ok
        else {
            return result( 200 );
        }
    }

    async #runTerser ( options ) {
        terser ??= await import( "terser" );

        var res;

        try {
            res = await terser.minify( this.#data, options );
        }
        catch ( e ) {
            return result( [ 500, e.message ] );
        }

        if ( res.error ) {
            return result( [ 500, res.error.message ] );
        }
        else {
            this.#data = res.code;

            return result( 200 );
        }
    }

    async #runCssnano ( preset ) {
        if ( !POSTCSS_CACHE[ preset ] ) {
            postcss ??= ( await import( "postcss" ) ).default;
            cssnano ??= ( await import( "Cssnano" ) ).default;

            POSTCSS_CACHE[ preset ] = postcss( [ cssnano( { "preset": CSSNANO_PRESETS[ preset ] } ) ] );
        }

        const res = await POSTCSS_CACHE[ preset ].process( this.#data, { "from": null } );

        this.#data = res.toString();

        return result( 200 );
    }

    async #runHtmlMinifier ( { cleanCssOptions, terserOptions } = {} ) {
        htmlMinifier ??= await import( "html-minifier-terser" );

        // https://github.com/terser/html-minifier-terser?tab=readme-ov-file#options-quick-reference
        this.#data = await htmlMinifier.minify( this.#data, {
            "caseSensitive": true,
            "collapseBooleanAttributes": true,
            "collapseInlineTagWhitespace": true,
            "collapseWhitespace": true,
            "decodeEntities": true,
            "html5": true,
            "includeAutoGeneratedTags": false,
            "keepClosingSlash": true,
            "minifyCSS": cleanCssOptions,
            "minifyJS": terserOptions,
            "preventAttributesEscaping": true,
            "quoteCharacter": '"',
            "removeAttributeQuotes": false,
            "removeComments": true,
            "useShortDoctype": true,
        } );

        // htmlMinifier ??= ( await import( "@minify-html/node" ) ).default;

        // this.#data = htmlMinifier
        //     .minify( Buffer.from( this.#data ), {
        //         "do_not_minify_doctype": true,
        //         "ensure_spec_compliant_unquoted_attribute_values": true,
        //         "keep_html_and_head_opening_tags": true,
        //         "minify_css": true,
        //         "minify_js": true,
        //         "keep_spaces_between_attributes": true,
        //         "keep_comments": false,
        //         "keep_closing_tags": true,
        //         "preserve_chevron_percent_template_syntax": true,
        //     } )
        //     .toString();

        return result( 200 );
    }

    #runJson ( action, { indent } = {} ) {
        try {
            if ( action === "lint" ) {
                this.#data = JSON.stringify( json5.parse( this.#data ), null, indent );
            }
            else {
                this.#data = JSON.stringify( json5.parse( this.#data ) );
            }

            return result( 200 );
        }
        catch {
            return result( 500 );
        }
    }

    #replaceTabs ( tabWidth ) {
        this.#data = this.#data.replaceAll( "\t", " ".repeat( tabWidth ) );
    }

    #replaceEndOfLine ( endOfLine ) {
        const eol = EOL[ endOfLine ];

        if ( !eol ) return;

        this.#data = this.#data.replaceAll( /\r\n|\r|\n/g, eol );
    }

    async #getConfigs ( dirname ) {
        this.#cache.configs ||= {};

        const cache = this.#cache.configs;

        if ( !cache[ dirname ] ) {
            const parent = path.dirname( dirname );

            let configs;

            if ( parent === dirname ) {
                configs = {};
            }
            else {
                configs = await this.#getConfigs( parent );
            }

            var fullPath;

            // package.json
            fullPath = await this.#fileExists( dirname, "package.json" );

            if ( fullPath ) {
                configs.package = fullPath;

                // cli.config.yaml
                fullPath = await this.#fileExists( dirname, "cli.config.yaml" );

                if ( fullPath ) {
                    configs.cli = fullPath;
                }
                else {
                    configs.cli = null;
                }
            }

            // prettier config
            fullPath = await this.#fileExists( dirname, [

                //
                ".prettierrc",
                ".prettierrc.json",
                ".prettierrc.yml",
                ".prettierrc.yaml",
                ".prettierrc.json5",
                ".prettierrc.js",
                "prettier.config.js",
                ".prettierrc.mjs",
                "prettier.config.mjs",
                ".prettierrc.cjs",
                "prettier.config.cjs",
                ".prettierrc.toml",
            ] );

            if ( fullPath ) {
                configs.prettier = fullPath;
            }

            // eslint config
            fullPath = await this.#fileExists( dirname, [

                //
                "/eslint.config.js",
                "/eslint.config.mjs",
                "/eslint.config.cjs",
            ] );

            if ( fullPath ) {
                configs.eslint = fullPath;
            }

            cache[ dirname ] = configs;
        }

        return { ...cache[ dirname ] };
    }

    async #fileExists ( cwd, basenames ) {
        if ( !Array.isArray( basenames ) ) basenames = [ basenames ];

        for ( const basename of basenames ) {
            const fullPath = path.join( cwd, basename );

            try {
                await fs.promises.access( fullPath );

                return fullPath;
            }
            catch {}
        }
    }

    async #getEditorConfig ( { fallbackToDefault } = {} ) {
        this.#cache.editorConfigs ||= new Map();

        // use default config
        if ( this.#useDefaults ) {
            return editorconfig.parse( path.join( RESOURCES_ROOT, path.basename( this.#fullPath ) ), {
                "cache": this.#cache.editorConfigs,
                "unset": true,
            } );
        }

        const config = await editorconfig.parse( this.#fullPath, {
            "cache": this.#cache.editorConfigs,
            "unset": true,
        } );

        if ( Object.keys( config ).length ) {
            return config;
        }

        // fallback to the default config
        else if ( fallbackToDefault ) {
            return editorconfig.parse( path.join( RESOURCES_ROOT, path.basename( this.#fullPath ) ), {
                "cache": this.#cache.editorConfigs,
                "unset": true,
            } );
        }
    }

    async #lintMarkdown ( { configs, editorConfig } = {} ) {
        const replaceCodeLanguage = false;

        var res;

        // pre-process markdown
        const markdown = new Markdown( this.#data ),
            nodes = [];

        markdown.traverse(
            ( node, index, parent ) => {
                nodes.push( {
                    "id": null,
                    "originalLanguage": node.lang,
                    "language": null,
                    node,
                } );
            },
            {
                "test": "code",
            }
        );

        for ( const node of nodes ) {
            const language = markdown.getCodeLanguage( node.originalLanguage );

            // language is not supported
            if ( !language ) continue;

            node.language = language.language;

            // language type is not supported
            if ( !language.type ) {
                if ( replaceCodeLanguage ) {
                    node.node.lang = node.language;
                }
            }
            else {
                node.id = node.node.lang = uuid();

                // lint code block
                res = await lintFile(
                    {
                        "path": "markdown-code-block",
                        "type": language.type,
                        "buffer": markdown.nodeToString( node.node ),
                    },
                    {
                        "cwd": this.#cwd,
                        "log": false,
                        "cache": this.#cache,
                    }
                );

                if ( res.data ) {
                    node.node.value = res.data.trim();
                }
            }
        }

        this.#data = markdown.toMarkdown();

        // prettier
        res = await this.#runPrettier( {
            configs,
            editorConfig,
        } );
        if ( !res.ok ) return res;

        // post-process markdown
        for ( const node of nodes ) {
            if ( !node.id ) continue;

            if ( replaceCodeLanguage ) {
                this.#data = this.#data.replace( node.id, node.language );
            }
            else {
                this.#data = this.#data.replace( node.id, node.originalLanguage );
            }
        }

        return result( 200 );
    }
}

export default async function lintFile ( file, { action = "lint", ...options } = {} ) {
    const lintFile = new LintFile( file, options );

    return lintFile.run( action );
}
