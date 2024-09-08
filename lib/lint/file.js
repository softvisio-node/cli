import prettier from "prettier";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mime from "#core/mime";
import JSON5 from "#core/json5";
import { ESLint as EsLint } from "eslint";
import Table from "#core/text/table";
import * as utils from "#core/utils";
import PrettierPluginSh from "prettier-plugin-sh";
import PrettierPluginPackageJson from "prettier-plugin-packagejson";
import PrettierPluginXml from "@prettier/plugin-xml";
import ansi from "#core/text/ansi";
import editorconfig from "editorconfig";

var terser, postcss, cssnano, htmlMinifier;

// NOTE conflicts with "video/mp2t"
mime.registerType( "application/x-typescript", {
    "extnames": [ ".ts", ".tsx", ".mts", ".cts" ],
    "compressible": true,
    "force": true,
} );

mime.registerType( "application/json", {
    "extnames": [ ".gyp" ],
    "compressible": true,
    "force": true,
} );

// 200 => [ 'OK',             1, $BOLD . $GREEN ],
// 201 => [ 'Warn',           1, $BOLD . $YELLOW ],
// 202 => [ 'File Ignored',   1, $YELLOW ],
// 400 => [ 'Error',          1, $BOLD . $WHITE . $ON_RED ],
// 404 => [ 'File Not Found', 1, $BOLD . $RED ],
// 500 => [ 'Fatal',          1, $BOLD . $WHITE . $ON_RED ],

const DEFAULT_ESLINT_CONFIG_JAVASCRIPT = utils.resolve( "#resources/eslint.config.javascript.js", import.meta.url ),
    DEFAULT_ESLINT_CONFIG_VUE = utils.resolve( "#resources/eslint.config.vue.js", import.meta.url ),
    DEFAULT_ESLINT_CONFIG_TYPESCRIPT = utils.resolve( "#resources/eslint.config.typescript.js", import.meta.url );

const TYPES = {
    "text/javascript": {
        "extname": ".js",
        "prettier": {
            "parser": "espree",
        },
        "eslint": {
            "config": DEFAULT_ESLINT_CONFIG_JAVASCRIPT,
        },
        "terser": true,
    },
    "application/node": {
        "extname": ".cjs",
        "prettier": {
            "parser": "espree",
        },
        "eslint": {
            "config": DEFAULT_ESLINT_CONFIG_JAVASCRIPT,
        },
        "terser": true,
    },
    "application/x-typescript": {
        "extname": ".ts",
        "prettier": {
            "parser": "typescript",
        },
        "eslint": {
            "config": DEFAULT_ESLINT_CONFIG_TYPESCRIPT,
        },
        "terser": false,
    },
    "application/x-vue": {
        "extname": ".vue",
        "prettier": {
            "parser": "vue",
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
    "errorOnUnmatchedPattern": true,
    "globInputPaths": true,
    "ignore": true,
    "ignorePatterns": null,
    "passOnNoPatterns": false,
    "warnIgnored": true,

    // lint
    "allowInlineConfig": true,
    "baseConfig": null,
    "overrideConfig": null,
    "overrideConfigFile": null,
    "plugins": null,
    "ruleFilter": undefined,
    "stats": false,

    // fix
    "fix": true,
    "fixTypes": null,

    // cache
    "cache": false,
    "cacheLocation": undefined,
    "cacheStrategy": "metadata",

    // other
    "flags": [],
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
    #cwd;
    #file;
    #processUnsupportedTypes;
    #write;
    #cache;
    #useDefaults;
    #fix;

    #absPath;
    #fullPath;
    #data;
    #type;
    #md5;
    #size;

    constructor ( file, { cwd, processUnsupportedTypes, write, useDefaults, fix = true, cache } = {} ) {
        this.#file = file;
        this.#cwd = cwd || process.cwd();
        this.#processUnsupportedTypes = !!processUnsupportedTypes;
        this.#write = !!write;
        this.#cache = cache || {};
        this.#useDefaults = !!useDefaults;
        this.#fix = !!fix;
    }

    // properties
    get cwd () {
        return this.#cwd;
    }

    get absPath () {
        if ( !this.#absPath ) {
            this.#absPath = path.normalize( path.resolve( this.#cwd, this.#file.path ) );
        }

        return this.#absPath;
    }

    get fullPath () {
        if ( !this.#fullPath ) {
            if ( this.#type?.extname && path.extname( this.absPath ) !== this.#type.extname ) {
                this.#fullPath = this.absPath + this.#type.extname;
            }
            else {
                this.#fullPath = this.absPath;
            }
        }

        return this.#fullPath;
    }

    // public
    async run ( action ) {
        this.#data = ( await this.#file.buffer() ).toString( "utf8" );

        // detect type
        {
            let type = this.#file.type;

            // get by shebang
            if ( !type ) {
                const mimeType = mime.getByShebang( this.#data );

                if ( mimeType ) type = mimeType.type;
            }

            if ( type ) this.#type = TYPES[ type ];
        }

        if ( !this.#type && !this.#processUnsupportedTypes ) return result( [ 202, "File ignored" ] );

        this.#md5 = this.#getMd5( this.#data );
        this.#size = this.#data.length;

        let res;

        if ( action === "lint" ) res = await this.#lint();
        else if ( action === "compress" ) res = await this.#compress();
        else if ( action === "obfuscate" ) res = await this.#obfuscate();

        if ( res.status >= 500 ) return res;

        const md5 = this.#getMd5( this.#data );

        if ( md5 !== this.#md5 ) {
            res.meta.isModified = true;
            res.meta.bytesDelta = this.#data.length - this.#size;

            if ( this.#write && this.absPath ) {
                await fs.promises.writeFile( this.absPath, this.#data );
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
        const configs = await this.#getConfigs( path.dirname( this.absPath ) ),
            editorConfig = await this.#getEditorConfig( {
                "fallbackToDefault": configs.package ? !!configs.cli : true,
            } );

        // prettier
        if ( this.#type?.prettier?.parser ) {
            let prettierConfig;

            // default prettier config
            if ( this.#useDefaults ) {
                prettierConfig = DEFAULT_PRETTIER_CONFIG;
            }

            // custom prettier config
            else if ( configs.prettier ) {
                this.#cache.prettierConfigs ||= {};

                if ( !this.#cache.prettierConfigs[ configs.prettier ] ) {
                    this.#cache.prettierConfigs[ configs.prettier ] = await prettier.resolveConfig( this.absPath, {
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

            if ( prettierConfig ) {
                prettierConfig = { ...prettierConfig };

                prettierConfig.plugins ??= [];
                prettierConfig.plugins.push( PrettierPluginSh, PrettierPluginPackageJson, PrettierPluginXml );
                prettierConfig.parser = this.#type.prettier.parser;
                prettierConfig.filepath = this.abspath;

                // merge prettier config with editor config
                if ( editorConfig ) {
                    prettierConfig.useTabs ??= editorConfig.indent_style === "tab";
                    prettierConfig.tabWidth ??= editorConfig.tab_width;
                    prettierConfig.printWidth ??= editorConfig.max_line_length === "off" ? Infinity : editorConfig.max_line_length;
                    prettierConfig.endOfLine ??= editorConfig.end_of_line;
                }

                // run prettier
                if ( prettierConfig ) {
                    try {

                        // pre-parse .json files
                        if ( this.#type.json ) this.#runJson( "lint" );

                        this.#data = await prettier.format( this.#data, prettierConfig );
                    }
                    catch ( e ) {
                        return result( [ 500, ansi.remove( e.message ) ] );
                    }
                }
            }
        }

        var res = result( 200 );

        // eslint
        if ( this.#type?.eslint ) {
            res = await this.#runEslint( {
                configs,
                editorConfig,
            } );

            if ( res.status >= 500 ) return res;
        }

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
                }

                // trim
                this.#data = this.#data.trim();

                // insert final new line
                if ( editorConfig.insert_final_newline ) {
                    this.#data += EOL[ eol ];
                }
            }
        }

        return res;
    }

    async #compress () {
        if ( this.#type ) {
            if ( this.#type.terser ) {
                return await this.#runTerser( { "compress": true, "mangle": false } );
            }
            else if ( this.#type.cssnano ) {
                return this.#runCssnano( "compress" );
            }
            else if ( this.#type.json ) {
                return this.#runJson( "compress" );
            }
            else if ( this.#type.html ) {
                return this.#runHtmlMinifier();
            }
        }

        return result( 200 );
    }

    async #obfuscate () {
        if ( this.#type ) {
            if ( this.#type.terser ) {
                return await this.#runTerser( { "compress": true, "mangle": true } );
            }
            else if ( this.#type.cssnano ) {
                return this.#runCssnano( "obfuscate" );
            }
            else if ( this.#type.json ) {
                return this.#runJson( "obfuscate" );
            }
        }

        return result( 200 );
    }

    #getMd5 ( data ) {
        return crypto.createHash( "MD5" ).update( data ).digest( "hex" );
    }

    async #runEslint ( { configs, editorConfig } ) {
        const fullPath = this.fullPath;

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
            "overrideConfigFile": this.#type.eslint.config,
            "overrideConfig": {
                "rules": {},
            },
        };

        // use default config
        if ( eslintConfig === true ) {
            options.cwd = path.dirname( fullPath );

            options.overrideConfigFile = this.#type.eslint.config;

            // apply editor config settings
            if ( editorConfig ) {
                const prefix = "";

                // const prefix = "@stylistic/"

                const indent = editorConfig.indent_style === "tab" ? "tab" : editorConfig.indent_size;

                // override @stylistic/indent
                if ( indent ) {
                    options.overrideConfig.rules[ prefix + "indent" ] = [ "error", indent ];
                }

                // override @stylistic/max-len
                if ( editorConfig.max_line_length ) {
                    options.overrideConfig.rules[ prefix + "max-len" ] = [
                        "error",
                        {
                            "code": editorConfig.max_line_length === "off" ? Infinity : editorConfig.max_line_length,
                            "tabWidth": editorConfig.tab_width,
                        },
                    ];
                }

                // override @stylistic/eol-last
                options.overrideConfig.rules[ prefix + "eol-last" ] = [ "error", editorConfig.insert_final_newline ? "always" : "never" ];

                // override @stylistic/no-trailing-spaces
                options.overrideConfig.rules[ prefix + "no-trailing-spaces" ] = [
                    "error",
                    {
                        "skipBlankLines": !editorConfig.trim_trailing_whitespace,
                        "ignoreComments": !editorConfig.trim_trailing_whitespace,
                    },
                ];
            }
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

        if ( report[ 0 ].output != null ) this.#data = report[ 0 ].output;

        // append log
        var log = "",
            hasWarnings,
            hasErrors;

        const table = new Table( {
            "lazy": true,
            "width": 100,
            "columns": {
                "severity": { "title": "Severity", "width": 10, "margin": [ 1, 0 ] },
                "line": { "title": "Line", "width": 10, "align": "right", "margin": [ 0, 1 ] },
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

        log = table.text;

        // vue
        if ( this.#type.type === "application/x-vue" ) {
            this.#data = this.#data.replace( /^\s*<!-- ----- SOURCE FILTER LOG BEGIN -----[\s\S]+?----- SOURCE FILTER LOG END ----- -->/m, "" );

            this.#data = this.#data.trim();

            if ( log ) {
                log = log.trim().replace( /-->/g, "---" ).replace( /^/gm, "<!-- " ).replace( /$/gm, " -->" );

                this.#data += "\n\n<!-- ----- SOURCE FILTER LOG BEGIN ----- -->\n";
                this.#data += "<!-- -->\n";
                this.#data += log + "\n";
                this.#data += "<!-- -->\n";
                this.#data += "<!-- ----- SOURCE FILTER LOG END ----- -->";
            }
        }

        // javascript
        else {
            this.#data = this.#data.replace( /^\s*\/\/ ----- SOURCE FILTER LOG BEGIN -----[\s\S]+?----- SOURCE FILTER LOG END -----/m, "" );

            this.#data = this.#data.trim();

            if ( log ) {
                log = log.trim().replace( /^/gm, "// " );

                this.#data += "\n\n// ----- SOURCE FILTER LOG BEGIN -----\n";
                this.#data += "//\n";
                this.#data += log + "\n";
                this.#data += "//\n";
                this.#data += "// ----- SOURCE FILTER LOG END -----";
            }
        }

        if ( hasErrors ) {
            return result( [ 400, "Errors" ] );
        }
        else if ( hasWarnings ) {
            return result( [ 201, "Warnings" ] );
        }
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

    async #runHtmlMinifier () {
        htmlMinifier ??= await import( "html-minifier" );

        this.#data = htmlMinifier.minify( this.#data, {
            "removeComments": true,
            "collapseWhitespace": true,
            "removeAttributeQuotes": false,
            "collapseBooleanAttributes": true,
            "removeScriptTypeAttributes": true,
        } );

        return result( 200 );
    }

    #runJson ( action ) {
        try {
            if ( action === "lint" ) {
                this.#data = JSON.stringify( JSON5.parse( this.#data ), null, 4 );
            }
            else {
                this.#data = JSON.stringify( JSON5.parse( this.#data ) );
            }

            return result( 200 );
        }
        catch ( e ) {
            return result( 500 );
        }
    }

    #replaceTabs ( tabWidth ) {
        this.#data = this.#data.replaceAll( "\t", " ".repeat( tabWidth ) );
    }

    #replaceEndOfLine ( endOfLine ) {
        const eol = EOL[ endOfLine ];

        if ( !eol ) return;

        this.#data = this.#data.replaceAll( /(?:\r\n|\r|\n)/g, eol );
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
            catch ( e ) {}
        }
    }

    async #getEditorConfig ( { fallbackToDefault } = {} ) {
        this.#cache.editorConfigs ||= new Map();

        // use default config
        if ( this.#useDefaults ) {
            return editorconfig.parse( path.join( RESOURCES_ROOT, path.basename( this.fullPath ) ), {
                "cache": this.#cache.editorConfigs,
                "unset": true,
            } );
        }

        const config = await editorconfig.parse( this.fullPath, {
            "cache": this.#cache.editorConfigs,
            "unset": true,
        } );

        if ( Object.keys( config ).length ) {
            return config;
        }

        // fallback to the default config
        else if ( fallbackToDefault ) {
            return editorconfig.parse( path.join( RESOURCES_ROOT, path.basename( this.fullPath ) ), {
                "cache": this.#cache.editorConfigs,
                "unset": true,
            } );
        }
    }
}

export default async function lintFile ( file, { action = "lint", ...options } = {} ) {
    const lintFile = new LintFile( file, options );

    return lintFile.run( action );
}
