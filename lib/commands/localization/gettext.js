import Command from "#lib/command";
import fs from "fs";
import path from "path";
import PoFile from "#core/locale/po-file";
import { parse as parseEspree } from "espree";
import { parse as parseVueSfc } from "@vue/compiler-sfc";
import { parse as parseVueTemplate } from "vue-eslint-parser";
import estraverse from "estraverse";

const vueTemplateParserOptions = { "sourceType": "module" },
    jsParserOpions = { "sourceType": "module", "ecmaVersion": "latest", "loc": true, "comment": true };

const EXTNAMES = new Set( [".js", ".mjs", ".cjs", ".vue"] );

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
            const extname = path.extname( file );

            if ( !EXTNAMES.has( extname ) ) this._throwError( `File type ${file} not supported` );

            if ( !fs.existsSync( file ) ) this._throwError( `File ${file} not found` );

            const content = fs.readFileSync( file, "utf8" );

            // .vue
            if ( extname === ".vue" ) {
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
                    const start = sfc.descriptor.template.loc.start;

                    if ( start.line === 1 ) start.column -= 10;

                    this.#parse( messages, `<template>${sfc.descriptor.template.content}</template>`, parseVueTemplate, vueTemplateParserOptions, file, start );
                }

                // vue script
                if ( sfc.descriptor?.script?.content ) {
                    const start = sfc.descriptor.script.loc.start;

                    if ( start.line === 1 ) start.column -= 8;

                    this.#parse( messages, sfc.descriptor.script.content, parseEspree, jsParserOpions, file, start );
                }
            }

            // .js, .mjs, .cjs
            else {
                this.#parse( messages, content, parseEspree, jsParserOpions, file );
            }
        }

        if ( process.cli.options.output ) {
            fs.writeFileSync( process.cli.options.output, new PoFile( { messages } ) + "" );
        }
        else {
            console.log( new PoFile( { messages } ) + "" );
        }
    }

    // protected
    _throwError ( message, { file, node, start } = {} ) {
        if ( file ) {
            if ( node ) {
                const { line, column } = this.#getNodeLocation( node, start );

                message = `Error at ${line}:${column} in the file: ${file}\n` + message;
            }
            else {
                message = `Error in the file: ${file}\n` + message;
            }
        }

        super._throwError( message );
    }

    // private
    #parse ( messages, content, parser, options, file, start ) {
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
                    this.#parseCallExpression( ast, node, messages, file, start );
                }
            },
            "keys": {
                "Program": ["body", "templateBody"],
                "VElement": ["children", "startTag"],
                "VText": [],
                "VStartTag": ["attributes"],
                "VAttribute": ["value"],
                "VExpressionContainer": ["expression"],
                "PropertyDefinition": [],
                "PrivateIdentifier": [],
                "ChainExpression": [],
            },
        } );
    }

    #parseCallExpression ( ast, node, messages, file, start ) {
        let method;

        if ( node.callee.type === "Identifier" ) {
            method = node.callee.name;
        }
        else if ( node.callee.type === "MemberExpression" ) {
            method = node.callee.property.name;
        }

        // not a i18n function / method
        if ( method !== "i18n" && method !== "i18nd" && method !== "i18nt" ) return;

        // at least 1 argument is required
        if ( !node.arguments?.[0] ) return;
        if ( method === "i18nd" && !node.arguments?.[1] ) return;

        var id,
            pluralId,
            isTemplate,
            extractedComments = [];

        // single form
        const arg = this.#parseCallExpressionArgument( method === "i18nd" ? node.arguments[1] : node.arguments[0], { file, start } );
        if ( !arg.string ) return;

        id = arg.string;
        if ( arg.isTemplate ) isTemplate = true;

        // plural form
        const pluralArg = method === "i18nd" ? node.arguments[2] : node.arguments[1];

        if ( pluralArg ) {
            const arg = this.#parseCallExpressionArgument( pluralArg, { file, start } );
            if ( !arg.string ) return;

            pluralId = arg.string;
            if ( arg.isTemplate ) isTemplate = true;
        }

        // extract comments
        extractedComments = this.#extractNodeComments( ast, node );

        const message = ( messages[id] ||= { id } );

        // plural form
        if ( pluralId ) message.pluralId = pluralId;

        // flags
        if ( isTemplate ) {
            message.flags = ["javascript-format"];
        }
        else {
            delete message.flags;
        }

        // references
        if ( file ) {
            message.references ||= [];

            const { line, column } = this.#getNodeLocation( node, start );

            const reference = `${file}:${line}:${column}`;

            message.references.push( reference );
        }

        // extracted comments
        if ( extractedComments ) {
            if ( message.extractedComments ) {
                message.extractedComments += "\n";
            }
            else {
                message.extractedComments = "";
            }

            message.extractedComments += extractedComments;
        }
    }

    #parseCallExpressionArgument ( node, location ) {
        var string, isTemplate;

        if ( node.type === "Literal" ) {
            string = node.value;
        }
        else if ( node.type === "TemplateLiteral" ) {
            if ( node.quasis.length === 1 ) {
                string = node.quasis.map( node => node.value.cooked ).join( "${n}" );
            }
            else {
                location.node = node;

                this._throwError( `Template literal with arguments must be tagged with the "msgid" tag`, location );
            }
        }
        else if ( node.type === "TaggedTemplateExpression" ) {
            if ( node.tag.name === "msgid" ) {
                string = node.quasi.quasis.map( node => node.value.cooked ).join( "${n}" );

                isTemplate = node.quasi.quasis.length > 1;
            }
            else {
                location.node = node;

                this._throwError( `Tagged template literal must be tagged with the "msgid" tag`, location );
            }
        }

        return { string, isTemplate };
    }

    #extractNodeComments ( ast, node ) {
        const comments = [];

        const astComments = ast.templateBody ? ast.templateBody.comments : ast.comments;

        if ( astComments?.length ) {
            const start = node.start,
                end = node.end;

            for ( const comment of astComments ) {
                if ( comment.type !== "Block" ) continue;

                if ( comment.start < start || comment.start > end ) continue;

                const value = comment.value.trim();

                if ( value ) comments.push( value );
            }
        }

        return comments.join( "\n" );
    }

    #getNodeLocation ( node, start ) {
        const nodeStart = node.loc.start;

        var line = nodeStart.line,
            column = nodeStart.column;

        if ( start ) {
            if ( line === 1 ) column += start.column;
            line += start.line - 1;
        }

        // message = `Error at ${loc.line}:${loc.column} in the file: ${file}\n` + message;

        return { line, column };
    }
}