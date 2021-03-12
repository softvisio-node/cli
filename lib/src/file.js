const result = require( "@softvisio/core/result" );
const prettier = require( "prettier" );
const crypto = require( "crypto" );
const fs = require( "fs" );
const path = require( "path" );
const mime = require( "@softvisio/core/db/mime" );
const JSON5 = require( "json5" );
const { ESLint } = require( "eslint" );

// XXX conflicts with "video/mp2t"
mime.registerContentType( "application/typescript", [".ts"], true, { "force": true } );

// 200 => [ 'OK',             1, $BOLD . $GREEN ],
// 201 => [ 'Warn',           1, $BOLD . $YELLOW ],
// 202 => [ 'File Ignored',   1, $YELLOW ],
// 400 => [ 'Error',          1, $BOLD . $WHITE . $ON_RED ],
// 404 => [ 'File Not Found', 1, $BOLD . $RED ],
// 500 => [ 'Fatal',          1, $BOLD . $WHITE . $ON_RED ],

const defaultPrettierConfig = prettier.resolveConfig.sync( __dirname + "/../../resources/1.txt", {
    "editorconfig": true,
    "config": __dirname + "/../../resources/.prettierrc.yaml",
} );

const defaultEslintConfigJavascript = path.resolve( __dirname, "../../resources/.eslintrc.javascript.js" );
const defaultEslintConfigTypescript = path.resolve( __dirname, "../../resources/.eslintrc.typescript.js" );

const eslintOptions = {
    "allowInlineConfig": true,
    "fix": true,
    "ignore": true,
    "overrideConfig": {
        "ignorePatterns": ["!.*"], // do not ignore .dot files
        "rules": {},
    },

    // "reportUnusedDisableDirectives": "error",
    "resolvePluginsRelativeTo": __dirname + "/../..",
    "useEslintrc": true,
};

const TYPE = {
    "application/javascript": { "parser": "babel", "yamlComments": true, "eslint": true, "terser": true },
    "application/typescript": { "parser": "typescript", "yamlComments": true, "eslint": true, "terser": false },
    "application/node": { "parser": "babel", "yamlComments": true, "eslint": true, "terser": true },
    "text/yaml": { "parser": "yaml" },
    "text/css": { "parser": "css", "cssnano": true },
    "text/x-scss": { "parser": "scss" },
    "text/less": { "parser": "less" },
    "application/json": { "parser": "json-stringify" },
    "text/markdown": { "parser": "markdown" },
    "text/html": { "parser": "html", "html": true },
    "application/x-sh": { "parser": "sh" },
    "text/xml": { "parser": "html" },
    "application/wsdl+xml": { "parser": "html" },
    "image/svg+xml": { "parser": "html" },
    "application/vue": { "parser": "vue", "yamlComments": true, "eslint": true },
};

const POSTCSS = {};

const YAML_COMMENTS = {
    "parser": "yaml",
    "useTabs": false,
    "tabWidth": 2,
    "printWidth": 99999999,
    "endOfLine": "lf",
    "semi": true,
    "singleQuote": false,
    "quoteProps": "as-needed",
    "bracketSpacing": true,
};

module.exports = class {
    #path;
    #data;
    #processUnsupported;
    #write;

    #type;
    #md5;
    #size;

    static getFileType ( filename, data ) {
        const mimeType = mime.getByFilename( filename, { "useShebang": true, data } );

        if ( !mimeType ) return;

        return TYPE[mimeType.id];
    }

    constructor ( filePath, options = {} ) {
        this.#path = filePath;

        this.#data = options.data;

        this.#processUnsupported = options.processUnsupported;

        this.#write = options.write;

        this.#type = this.constructor.getFileType( this.#path, this.#data );
    }

    get type () {
        return this.#type;
    }

    async run ( action ) {
        if ( !this.#type && !this.#processUnsupported ) return result( [202, "File ignored"] );

        if ( this.#data == null ) {
            this.#data = fs.readFileSync( this.#path, "utf8" );

            if ( this.#write == null ) this.#write = true;
        }

        this.#md5 = this._getMd5( this.#data );
        this.#size = this.#data.length;

        const res = await this["_" + action]();

        if ( res.status >= 500 ) return res;

        const md5 = this._getMd5( this.#data );

        if ( md5 !== this.#md5 ) {
            res.isModified = true;
            res.bytesDelta = this.#data.length - this.#size;

            if ( this.#write ) fs.writeFileSync( this.#path, this.#data );
        }
        else {
            res.isModified = false;
            res.bytesDelta = 0;
        }

        res.data = this.#data;

        return res;
    }

    // TODO replace end of line
    async _lint () {

        // load config
        var config;

        try {
            config = prettier.resolveConfig.sync( this.#path, {
                "editorconfig": true,
            } );
        }
        catch ( e ) {}

        if ( config ) {
            config = { ...defaultPrettierConfig, ...config };
        }

        // fallback to the default config
        else {
            config = prettier.resolveConfig.sync( __dirname + "/../../resources/" + path.basename( this.#path ), {
                "editorconfig": true,
                "config": __dirname + "/../../resources/.prettierrc.yaml",
            } );
        }

        var res = result( 200 );

        // supported file type
        if ( this.#type ) {

            // format yaml docs, need to run before prettier
            if ( this.#type.yamlComments ) {
                this._yamlComments();
            }

            // run prettier
            if ( this.#type.parser ) {
                config.parser = this.#type.parser;
                config.filepath = this.#path;

                try {

                    // pre-parse package.json
                    if ( path.basename( this.#path ) === "package.json" ) {
                        this.#data = JSON.stringify( JSON5.parse( this.#data ) );
                    }

                    this.#data = prettier.format( this.#data, config );
                }
                catch ( e ) {
                    return result( [500, e.message] );
                }
            }

            // eslint
            if ( this.#type.eslint ) {

                // replace tabs
                if ( !config.useTabs ) this.#data = this.#data.replace( /\t/g, " ".repeat( config.tabWidth ) );

                res = await this._eslint( config.useTabs ? "tab" : config.tabWidth );

                if ( res.status >= 500 ) return res;
            }
        }

        // not-supported file type
        else {

            // replace tabs
            if ( !config.useTabs ) this.#data = this.#data.replace( /\t/g, " ".repeat( config.tabWidth ) );

            // TODO replace line end
            // config.endOfLine: "lf"
        }

        // cut trailing line spaces
        this.#data = this.#data.replace( / +\n/g, "\n" );

        // trim, insert final newline
        this.#data = this.#data.trim() + "\n";

        return res;
    }

    async _compress () {
        if ( this.#type ) {
            if ( this.#type.terser ) {
                return this._terser( { "compress": true, "mangle": false } );
            }
            else if ( this.#type.cssnano ) {
                return this._cssnano( "default" );
            }
            else if ( this.#type.html ) {
                return this._html();
            }
        }

        return result( 200 );
    }

    async _obfuscate () {
        if ( this.#type ) {
            if ( this.#type.terser ) {
                return this._terser( { "compress": true, "mangle": true } );
            }
            else if ( this.#type.cssnano ) {
                return this._cssnano( "advanced" );
            }
        }

        return result( 200 );
    }

    _getMd5 ( data ) {
        return crypto.createHash( "MD5" ).update( data ).digest( "hex" );
    }

    // TODO table
    // TODO detect eslint config
    async _eslint ( indent ) {
        const eslint = new ESLint( eslintOptions );

        // TODO detect, if project has eslint config
        const config = await eslint.calculateConfigForFile( this.#path );

        var report;

        if ( config.parser ) {
            report = await eslint.lintText( this.#data, {
                "filePath": this.#path,
                "warnIgnored": true,
            } );
        }

        // fallback to the default config
        else {
            const options = {
                ...eslintOptions,
                "overrideConfigFile": this.#type.parser === "typescript" ? defaultEslintConfigTypescript : defaultEslintConfigJavascript,
                "useEslintrc": false,
            };

            if ( indent ) options.overrideConfig.rules.indent = ["error", indent];

            const defaultEslint = new ESLint( options );

            report = await defaultEslint.lintText( this.#data, {
                "filePath": this.#path,
                "warnIgnored": true,
            } );
        }

        if ( report[0].output != null ) this.#data = report[0].output;

        // append log
        var log = "",
            hasWarnings,
            hasErrors;

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

            log += `${severity}, ${msg.line}:${msg.column}, ${msg.ruleId}, ${msg.message}\n`;
        }

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

    _yamlComments () {
        const YAML = require( "js-yaml" );

        this.#data = this.#data.replace( /\/\*\*([\s\S]*?)\*\//gm, match => {
            var match1 = match //
                .replace( /^[ \t]*\/\*+ */gm, "" )
                .replace( /^[ \t]*\*\/.*/gm, "" )
                .replace( /^[ \t]*\* ?/gm, "" );

            try {
                YAML.load( match1 );
            }
            catch ( e ) {
                return match;
            }

            try {
                match = prettier.format( match1, YAML_COMMENTS );
            }
            catch ( e ) {
                return match;
            }

            match = match //
                .replace( /^/gm, "* " )
                .replace( /^\*/, "/**" )
                .replace( /\* $/, "*/" );

            return match;
        } );
    }

    _terser ( options ) {
        const terser = require( "terser" );

        var res;

        try {
            res = terser.minify( this.#data, options );
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

    async _cssnano ( preset ) {
        if ( !POSTCSS[preset] ) {
            const postcss = require( "postcss" );
            const cssnano = require( "Cssnano" );

            POSTCSS[preset] = postcss( [
                cssnano( {
                    preset,
                } ),
            ] );
        }

        const res = await POSTCSS[preset].process( this.#data, { "from": null } );

        this.#data = res.toString();

        return result( 200 );
    }

    _html () {
        const minifier = require( "html-minifier" );

        this.#data = minifier.minify( this.#data, {
            "removeComments": true,
            "collapseWhitespace": true,
            "removeAttributeQuotes": false,
            "collapseBooleanAttributes": true,
            "removeScriptTypeAttributes": true,
        } );

        return result( 200 );
    }
};
