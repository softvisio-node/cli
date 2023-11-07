import fs from "node:fs";
import path from "node:path";
import { parse as parseEspree } from "espree";
import { parse as parseVueSfc } from "@vue/compiler-sfc";
import { parse as parseVueTemplate } from "vue-eslint-parser";
import estraverse from "estraverse";
import yaml from "#core/yaml";
import PoFile from "#core/locale/po-file";
import { Template } from "#core/ejs";

const vueTemplateParserOptions = { "sourceType": "module" },
    jsParserOpions = {
        "sourceType": "module",
        "ecmaVersion": "latest",
        "loc": true,
        "comment": true,
    };

const EXTNAMES = new Set( [".js", ".mjs", ".cjs", ".vue", ".yaml", ".yml"] );

export default class GetText {

    // public
    extract ( absPath, relPath ) {
        const poFile = new PoFile();

        const extname = path.extname( absPath );

        if ( !EXTNAMES.has( extname ) ) return result( 200 );

        if ( !fs.existsSync( absPath ) ) return this.#error( `File ${absPath} not found` );

        const content = fs.readFileSync( absPath, "utf8" );

        try {

            // .vue
            if ( extname === ".vue" ) {
                let sfc;

                // vue sfc
                try {
                    sfc = parseVueSfc( content );
                }
                catch ( e ) {
                    throw this.#error( e, { "file": relPath } );
                }

                // vue template
                if ( sfc.descriptor?.template?.content ) {
                    const start = sfc.descriptor.template.loc.start;

                    if ( start.line === 1 ) start.column -= 10;

                    this.#parse( poFile, `<template>${sfc.descriptor.template.content}</template>`, parseVueTemplate, vueTemplateParserOptions, relPath, start );
                }

                // vue script
                if ( sfc.descriptor?.script?.content ) {
                    const start = sfc.descriptor.script.loc.start;

                    if ( start.line === 1 ) start.column -= 8;

                    this.#parse( poFile, sfc.descriptor.script.content, parseEspree, jsParserOpions, relPath, start );
                }
            }

            // .js, .mjs, .cjs
            else if ( extname === ".js" || extname === ".mjs" || extname === ".cjs" ) {
                this.#parse( poFile, content, parseEspree, jsParserOpions, relPath );
            }

            // yaml
            else {
                this.#parseYaml( poFile, content, relPath );
            }
        }
        catch ( e ) {
            return result.catch( e, { "silrnt": true, "keepError": true } );
        }

        return result( 200, poFile );
    }

    // private
    #error ( message, { file, node, start } = {} ) {
        if ( file ) {
            if ( node ) {
                const { line, column } = this.#getNodeLocation( node, start );

                message = `Error at ${line}:${column} in the file: ${file}\n` + message;
            }
            else {
                message = `Error in the file: ${file}\n` + message;
            }
        }

        return result( [500, message] );
    }

    #parse ( poFile, content, parser, options, file, start ) {
        try {
            var ast = parser( content, options );
        }
        catch ( e ) {
            throw this.#error( e, { file } );
        }

        estraverse.traverse( ast, {
            "enter": ( node, parent ) => {
                if ( node.type === "VAttribute" ) {
                    if ( node.directive !== true || node.key.name.name !== "bind" ) return estraverse.VisitorOption.Skip;
                }
                else if ( node.type === "CallExpression" ) {
                    this.#parseCallExpression( ast, node, poFile, file, start );
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

    #parseCallExpression ( ast, node, poFile, file, start ) {
        let method;

        if ( node.callee.type === "Identifier" ) {
            method = node.callee.name;
        }
        else if ( node.callee.type === "MemberExpression" ) {
            method = node.callee.property.name;
        }

        // not a l10n function / method
        if ( method !== "l10n" && method !== "l10nt" ) return;

        // at least 1 argument is required
        if ( !node.arguments?.[0] ) return;

        var id,
            message = {
                "pluralId": null,
                "references": null,
                "flags": null,
                "extractedComments": null,
            };

        // message id
        const msgId = this.#parseMessage( node.arguments[0], { file, start } );
        if ( !msgId.value ) return;
        id = msgId.value;
        if ( msgId.isTemplate ) message.flags = ["javascript-format"];

        // plural
        if ( node.arguments[1] ) {
            const plural = this.#parseMessage( node.arguments[1], { file, start } );
            if ( !plural.value ) return;
            message.pluralId = plural.value;
            if ( plural.isTemplate ) message.flags = ["javascript-format"];
        }

        // extracted comments
        const extractedComments = this.#extractNodeComments( ast, node );
        if ( extractedComments ) {
            message.extractedComments = {};
            message.extractedComments.comments ??= [];
            message.extractedComments.comments.push( extractedComments );
        }

        // references
        if ( file ) {
            const { line, column } = this.#getNodeLocation( node, start );

            const reference = `${file}:${line}:${column}`;

            message.references = reference;
        }

        poFile.addMessages( { [id]: message } );
    }

    #parseMessage ( node, location ) {
        const res = {
            "value": null,
            "isTemplate": null,
        };

        if ( node.type === "Literal" ) {
            res.value = node.value;
        }
        else if ( node.type === "TemplateLiteral" ) {
            if ( node.quasis.length === 1 ) {
                res.value = node.quasis.map( node => node.value.cooked ).join( "${n}" );
            }
            else {
                location.node = node;

                throw this.#error( `Template literal with arguments must be tagged with the "msgid" tag`, location );
            }
        }
        else if ( node.type === "TaggedTemplateExpression" ) {
            if ( node.tag.name === "msgid" ) {
                res.value = node.quasi.quasis.map( node => node.value.cooked ).join( "${n}" );

                res.isTemplate = node.quasi.quasis.length > 1;
            }
            else {
                location.node = node;

                throw this.#error( `Tagged template literal must be tagged with the "msgid" tag`, location );
            }
        }

        return res;
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

    #parseYaml ( poFile, content, file ) {
        const locale = {
            l10n ( msgId, plural, pluralNumber ) {
                poFile.addMessages( {
                    [msgId]: {
                        "pluralId": plural,
                        "references": [file],
                    },
                } );
            },

            l10nt ( msgId, plural, pluralNumber ) {
                poFile.addMessages( {
                    [msgId]: {
                        "pluralId": plural,
                        "references": [file],
                    },
                } );
            },
        };

        const ejs = template => {
            template = new Template( template );

            template.compile();

            this.#parse(
                poFile,
                template.source,
                parseEspree,
                {
                    ...jsParserOpions,
                    "sourceType": "commonjs",
                },
                file
            );
        };

        yaml.parse( content, { "all": true, locale, ejs } );
    }
}
