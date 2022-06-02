import Command from "#lib/command";
import fs from "fs";
import PoFile from "#core/l10n/po-file";
import { parse as parseEspree } from "espree";
import { parse as parseVueSfc } from "@vue/compiler-sfc";
import { parse as parseVueTemplate } from "vue-eslint-parser";
import estraverse from "estraverse";

export default class extends Command {
    static cli () {
        return {
            "description": `PoEdit extractor settings:
    Extensions: *.js;*.mjs;*.cjs;*.vue
    Command: cmd /C "softvisio-cli.cmd localization gettext --output %o %F"
    File: %f
`,
            "options": {
                "output": {
                    "description": "output file path",
                    "schema": { "type": "string" },
                },
            },
            "arguments": {
                "files": {
                    "description": "input files paths",
                    "schema": { "type": "array", "item": { "type": "string" }, "minItems": 1 },
                },
            },
        };
    }

    async run () {
        const messages = {};

        for ( const file of process.cli.arguments.files ) {
            if ( !fs.existsSync( file ) ) this._throwError( `File ${file} not found` );

            const content = fs.readFileSync( file, "utf8" );

            // .vue
            if ( file.endsWith( ".vue" ) ) {
                let sfc;

                // vue sfc
                try {
                    sfc = parseVueSfc( content );
                }
                catch ( e ) {
                    this._throwError( e, { file } );
                }

                // vue template
                if ( sfc.descriptor?.template?.content ) {
                    this.#parse( messages.sfc.descriptor.template.content, parseVueTemplate, { "sourceType": "module" }, file );
                }

                // vue script
                if ( sfc.descriptor?.script?.content ) {
                    this.#parse( messages.sfc.descriptor.script.content, parseEspree, { "sourceType": "module", "ecmaVersion": 2015, "loc": true }, file );
                }
            }

            // .cjs
            else if ( file.endsWith( ".cjs" ) ) {
                this.#parse( messages, content, parseEspree, { "sourceType": "commonjs", "loc": true }, file );
            }

            // .js, .mjs
            else if ( file.endsWith( ".js" ) || file.endsWith( ".mjs" ) ) {
                this.#parse( messages, content, parseEspree, { "sourceType": "module", "ecmaVersion": 2015, "loc": true }, file );
            }
        }

        if ( process.cli.options.output ) {
            fs.writeFileSync( process.cli.options.output, new PoFile( { messages } ) + "" );
        }
        else {
            console.log( new PoFile( { messages } ) + "" );
        }
    }

    // private
    #parse ( messages, content, parser, options, file ) {
        try {
            var ast = parser( content, options );
        }
        catch ( e ) {
            this._throwError( e, { file } );
        }

        estraverse.traverse( ast, {
            "enter": ( node, parent ) => {
                if ( node.type === "VAttribute" ) {
                    if ( node.directive !== true || node.key.name.name !== "bind" ) return estraverse.VisitorOption.Skip;
                }
                else if ( node.type === "CallExpression" ) {
                    this.#parseCallExpression( node, messages, file );
                }
            },
            "keys": {
                "Program": ["body", "templateBody"],
                "VElement": ["children", "startTag"],
                "VText": [],
                "VStartTag": ["attributes"],
                "VAttribute": ["value"],
                "VExpressionContainer": ["expression"],
            },
        } );
    }

    #parseCallExpression ( node, messages, file ) {
        let method;

        if ( node.callee.type === "Identifier" ) {
            method = node.callee.name;
        }
        else if ( node.callee.type === "MemberExpression" ) {
            method = node.callee.property.name;
        }

        // not a i18n function / method
        if ( method !== "i18n" ) return;

        // at least 1 argument is required
        if ( !node.arguments?.[0] ) return;

        const message = {};

        const arg = this.#getMessageId( node.arguments[0], { file, "line": node.loc.start.line, "column": node.loc.start.column } );
        if ( !arg.msgId ) return;

        message.id = arg.msgId;
        if ( arg.hasTemplate ) message.hasTemplate = true;

        // plural
        if ( node.arguments[1] ) {
            const arg = this.#getMessageId( node.arguments[1], { file, "line": node.loc.start.line, "column": node.loc.start.column } );
            if ( !arg.msgId ) return;

            message.pluralId = arg.msgId;
            if ( arg.hasTemplate ) message.hasTemplate = true;
        }

        const extractedComments = [];

        // extract comments
        for ( const arg of node.arguments ) {
            if ( arg.leadingComments ) {
                extractedComments.push( arg.leadingComments
                    .map( block => block.value.trim() )
                    .filter( value => value )
                    .join( " " ) );
            }

            if ( arg.trailingComments ) {
                extractedComments.push( arg.trailingComments
                    .map( block => block.value.trim() )
                    .filter( value => value )
                    .join( " " ) );
            }
        }

        messages[message.id] ||= {};

        // plural form
        if ( message.pluralId ) messages[message.id].plural = message.pluralId;

        // flags
        if ( message.hasTemplate ) messages[message.id].flags = "javascript-format";

        // references
        if ( file ) {
            const references = `${file}:${node.loc.start.line}:${node.loc.start.column}`;

            if ( messages[message.id].references ) {
                messages[message.id].references += " " + references;
            }
            else {
                messages[message.id].references = references;
            }
        }

        // extracted comments
        if ( extractedComments.length ) {
            if ( messages[message.id].extractedComments ) {
                messages[message.id].extractedComments += "\n" + extractedComments.join( "\n" );
            }
            else {
                messages[message.id].extractedComments = extractedComments.join( "\n" );
            }
        }
    }

    #getMessageId ( node, location ) {
        var msgId, hasTemplate, comment;

        if ( node.type === "Literal" ) {
            msgId = node.value;
        }
        else if ( node.type === "TemplateLiteral" ) {
            if ( node.quasis.length === 1 ) {
                msgId = node.quasis.map( node => node.value.cooked ).join( "${n}" );
            }
            else {
                this._throwError( `Template literal with arguments must be tagged with the "msgid" tag`, location );
            }
        }
        else if ( node.type === "TaggedTemplateExpression" ) {
            if ( node.tag.name === "msgid" ) {
                msgId = node.quasi.quasis.map( node => node.value.cooked ).join( "${n}" );

                hasTemplate = node.quasi.quasis.length > 1;
            }
            else {
                this._throwError( `Tagged template literal must be tagged with the "msgid" tag`, location );
            }
        }

        return { msgId, hasTemplate, comment };
    }

    // protected
    _throwError ( message, { file, line, column } = {} ) {
        if ( file ) {
            if ( line != null ) {
                message = `Error in line:${line}, column:${column} in the file: ${file}\n` + message;
            }
            else {
                message = `Error in the file: ${file}\n` + message;
            }
        }

        super._throwError( message );
    }
}
