import prettier from "prettier";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import mime from "#core/mime";
import JSON5 from "#core/json5";
import { ESLint as EsLint } from "eslint";
import { Table } from "#core/text";
import * as utils from "#core/utils";

var terser, postcss, cssnano, htmlMinifier;

// XXX conflicts with "video/mp2t"
mime.registerType( "application/typescript", [".ts"], true, { "force": true } );
mime.registerType( "application/json", [".gyp"], true, { "force": true } );

// 200 => [ 'OK',             1, $BOLD . $GREEN ],
// 201 => [ 'Warn',           1, $BOLD . $YELLOW ],
// 202 => [ 'File Ignored',   1, $YELLOW ],
// 400 => [ 'Error',          1, $BOLD . $WHITE . $ON_RED ],
// 404 => [ 'File Not Found', 1, $BOLD . $RED ],
// 500 => [ 'Fatal',          1, $BOLD . $WHITE . $ON_RED ],

const TYPES = {
    "application/javascript": { "parser": "babel", "eslint": true, "terser": true },
    "application/typescript": { "parser": "typescript", "eslint": true, "terser": false },
    "application/node": { "parser": "babel", "eslint": true, "terser": true },
    "text/yaml": { "parser": "yaml" },
    "text/css": { "parser": "css", "cssnano": true },
    "text/x-scss": { "parser": "scss" },
    "text/less": { "parser": "less" },
    "application/json": { "parser": "json-stringify", "json": true },
    "text/markdown": { "parser": "markdown" },
    "text/html": { "parser": "html", "html": true },
    "application/x-sh": { "parser": "sh" },
    "text/xml": { "parser": "xml" },
    "application/wsdl+xml": { "parser": "xml" },
    "image/svg+xml": { "parser": "xml" },
    "application/vue": { "parser": "vue", "eslint": true },
};

const RESOURCES_ROOT = path.dirname( utils.resolve( "#resources/.prettierrc.yaml", import.meta.url ) );

const DEFAULT_PRETTIER_CONFIG_PATH = RESOURCES_ROOT + "/.prettierrc.yaml";
const DEFAULT_PRETTIER_CONFIG = prettier.resolveConfig.sync( RESOURCES_ROOT + "/1.txt", {
    "editorconfig": true,
    "config": DEFAULT_PRETTIER_CONFIG_PATH,
} );

const DEFAULT_ESLINT_CONFIG_JAVASCRIPT = utils.resolve( "#resources/.eslintrc.javascript.cjs", import.meta.url );
const DEFAULT_ESLINT_CONFIG_TYPESCRIPT = utils.resolve( "#resources/.eslintrc.typescript.cjs", import.meta.url );
const DEFAULT_ESLINT_CONFIG_JEST = utils.resolve( "#resources/.eslintrc.jest.cjs", import.meta.url );

const ESLINT_OPTIONS = {
    "allowInlineConfig": true, // enable or disable inline configuration comment
    "fix": true, // execute in autofix mode. If a function, should return a boolean
    "ignore": true, // false - disables use of .eslintignore
    "overrideConfig": {
        "ignorePatterns": ["!.*", "!/**/node_modules/*"], // do not ignore .dot files and node_modules
        "rules": {},
    },

    // "reportUnusedDisableDirectives": "error", // we use rule to process disable directives
    "resolvePluginsRelativeTo": path.dirname( RESOURCES_ROOT ),
    "useEslintrc": true,
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

export default class LintFile {
    #file;
    #processUnsupported;
    #write;

    #data;
    #type;
    #md5;
    #size;

    // options:
    // processUnsupported
    // write
    constructor ( file, options = {} ) {
        this.#file = file;
        this.#data = options.data;
        this.#processUnsupported = options.processUnsupported;
        this.#write = options.write;
    }

    // static
    static isTypeSupported ( filename ) {
        const type = mime.getByFilename( filename );

        // unknown
        if ( !type ) return;

        return !!TYPES[type.type];
    }

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

            if ( type ) this.#type = TYPES[type];
        }

        if ( !this.#type && !this.#processUnsupported ) return result( [202, "File ignored"] );

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

            if ( this.#write && this.#file.path ) fs.writeFileSync( this.#file.path, this.#data );
        }
        else {
            res.meta.isModified = false;
            res.meta.bytesDelta = 0;
        }

        res.data = this.#data;

        return res;
    }

    async #lint () {

        // load config
        var config;

        try {
            config = prettier.resolveConfig.sync( this.#file.path, {
                "editorconfig": true,
            } );
        }
        catch ( e ) {}

        if ( config ) {
            config = { ...DEFAULT_PRETTIER_CONFIG, ...config };
        }

        // fallback to the default config
        else {
            config = prettier.resolveConfig.sync( RESOURCES_ROOT + "/" + path.basename( this.#file.path ), {
                "editorconfig": true,
                "config": DEFAULT_PRETTIER_CONFIG_PATH,
            } );
        }

        var res = result( 200 );

        // supported file type
        if ( this.#type ) {

            // run prettier
            if ( this.#type.parser ) {
                config.parser = this.#type.parser;
                config.filepath = this.#file.path;

                try {

                    // pre-parse .json files
                    if ( this.#type.json ) this.#json( "lint" );

                    this.#data = prettier.format( this.#data, config );
                }
                catch ( e ) {
                    return result( [500, e.message] );
                }
            }

            // eslint
            if ( this.#type.eslint ) {

                // replace tabs
                if ( !config.useTabs ) this.#replaceTabs( config.tabWidth );

                res = await this.#eslint( config.useTabs ? "tab" : config.tabWidth );

                if ( res.status >= 500 ) return res;
            }
        }

        // not-supported file type
        else {

            // replace tabs
            if ( !config.useTabs ) this.#replaceTabs( config.tabWidth );

            // replace end of line
            if ( config.endOfLine ) this.#replaceEndOfLine( config.endOfLine );
        }

        // cut trailing line spaces
        this.#data = this.#data.replace( / +\n/g, "\n" );

        // trim, insert final newline
        this.#data = this.#data.trim() + "\n";

        return res;
    }

    async #compress () {
        if ( this.#type ) {
            if ( this.#type.terser ) {
                return await this.#terser( { "compress": true, "mangle": false } );
            }
            else if ( this.#type.cssnano ) {
                return this.#cssnano( "compress" );
            }
            else if ( this.#type.json ) {
                return this.#json( "compress" );
            }
            else if ( this.#type.html ) {
                return this.#html();
            }
        }

        return result( 200 );
    }

    async #obfuscate () {
        if ( this.#type ) {
            if ( this.#type.terser ) {
                return await this.#terser( { "compress": true, "mangle": true } );
            }
            else if ( this.#type.cssnano ) {
                return this.#cssnano( "obfuscate" );
            }
            else if ( this.#type.json ) {
                return this.#json( "obfuscate" );
            }
        }

        return result( 200 );
    }

    #getMd5 ( data ) {
        return crypto.createHash( "MD5" ).update( data ).digest( "hex" );
    }

    // XXX detect eslint config
    async #eslint ( indent ) {
        var eslint = new EsLint( ESLINT_OPTIONS );

        // TODO detect, if project has eslint config
        const config = await eslint.calculateConfigForFile( this.#file.path );

        // fallback to the default config
        if ( !config.parser ) {
            let overrideConfigFile;

            if ( this.#type.parser === "typescript" ) overrideConfigFile = DEFAULT_ESLINT_CONFIG_TYPESCRIPT;
            else if ( this.#file.path.includes( "__tests__" ) ) overrideConfigFile = DEFAULT_ESLINT_CONFIG_JEST;
            else overrideConfigFile = DEFAULT_ESLINT_CONFIG_JAVASCRIPT;

            const options = {
                ...ESLINT_OPTIONS,
                overrideConfigFile,
                "useEslintrc": false,
            };

            if ( indent ) options.overrideConfig.rules.indent = ["error", indent];

            eslint = new EsLint( options );
        }

        const report = await eslint.lintText( this.#data, {
            "filePath": this.#file.path,
            "warnIgnored": true,
        } );

        if ( report[0].output != null ) this.#data = report[0].output;

        // append log
        var log = "",
            hasWarnings,
            hasErrors;

        const table = new Table( {
            "lazy": true,
            "width": 100,
            "columns": {
                "severity": { "title": "Severity", "width": 10, "margin": [1, 0] },
                "line": { "title": "Line", "width": 10, "align": "right", "margin": [0, 1] },
                "description": { "title": "Desctiption", "margin": [1, 0] },
            },
        } );

        for ( const msg of report[0].messages.sort( ( a, b ) => b.severity - a.severity || a.line - b.line || a.column - b.column ) ) {
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
                "line": `${msg.line}:${msg.column}`,
                "description": msg.ruleId + ", " + msg.message,
            } );
        }

        table.end();

        log = table.text;

        // javascript
        if ( this.#type.parser === "babel" || this.#type.parser === "typescript" ) {
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

        // vue
        else if ( this.#type.parser === "vue" ) {
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

        if ( hasErrors ) {
            return result( [400, "Errors"] );
        }
        else if ( hasWarnings ) {
            return result( [201, "Warnings"] );
        }
        else {
            return result( 200 );
        }
    }

    async #terser ( options ) {
        terser ??= await import( "terser" );

        var res;

        try {
            res = await terser.minify( this.#data, options );
        }
        catch ( e ) {
            return result( [500, e.message] );
        }

        if ( res.error ) {
            return result( [500, res.error.message] );
        }
        else {
            this.#data = res.code;

            return result( 200 );
        }
    }

    async #cssnano ( preset ) {
        if ( !POSTCSS_CACHE[preset] ) {
            postcss ??= ( await import( "postcss" ) ).default;
            cssnano ??= ( await import( "Cssnano" ) ).default;

            POSTCSS_CACHE[preset] = postcss( [cssnano( { "preset": CSSNANO_PRESETS[preset] } )] );
        }

        const res = await POSTCSS_CACHE[preset].process( this.#data, { "from": null } );

        this.#data = res.toString();

        return result( 200 );
    }

    async #html () {
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

    #json ( action ) {
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
        const eol = EOL[endOfLine];

        if ( !eol ) return;

        this.#data = this.#data.replaceAll( /(?:\r\n|\r|\n)/g, eol );
    }
}
