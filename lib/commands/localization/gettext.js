import Command from "#lib/command";
import fs from "fs";
import PoFile from "#core/l10n/po-file";
import babelParser from "@babel/parser";
import babelTraverse from "@babel/traverse";

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
                    "required": true,
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

                // script
                const script = content.match( /<script>(.+)<\/script>/ms )?.[1];
                if ( script ) this.#parse( script, messages, "module", file );

                // template
                const template = content.match( /<template>(.+)<\/template>/ms )?.[1];
                if ( template ) {
                    for ( const tag of template.matchAll( /<[^>]+>/g ) ) {
                        for ( const attrobute of tag[0].matchAll( /:[a-zA-Z0-9-_]+=(["'])([^\1]+?)\1/g ) ) {
                            if ( !attrobute[2].includes( "i18n`" ) && !attrobute[2].includes( "i18p`" ) ) continue;

                            this.#parse( attrobute[2], messages, "module", file );
                        }
                    }
                }
            }

            // .cjs
            else if ( file.endsWith( ".cjs" ) ) {
                this.#parse( content, messages, "script", file );
            }

            // .js, .mjs
            else if ( file.endsWith( ".js" ) || file.endsWith( ".mjs" ) ) {
                this.#parse( content, messages, "module", file );
            }
        }

        fs.writeFileSync( process.cli.options.output, new PoFile( { messages } ) + "" );
    }

    // private
    #parse ( string, messages, sourceType, file ) {
        try {
            var ast = babelParser.parse( string, { sourceType } );
        }
        catch ( e ) {
            this._throwError( e, { file } );
        }

        babelTraverse.default( ast, {
            "CallExpression": path => {
                let method;

                if ( path.node.callee.type === "Identifier" ) {
                    method = path.node.callee.name;
                }
                else if ( path.node.callee.type === "MemberExpression" ) {
                    method = path.node.callee.property.name;
                }

                // not a i18n function / method
                if ( method !== "i18n" ) return;

                // at least 1 argument is required
                if ( !path.node.arguments?.[0] ) return;

                const message = {};

                const arg = this.#getMessageId( path.node.arguments[0], { file, "line": path.node.loc.start.line, "column": path.node.loc.start.column } );
                if ( !arg.msgId ) return;

                message.id = arg.msgId;
                if ( arg.hasTemplate ) message.hasTemplate = true;

                // plural
                if ( path.node.arguments[1] ) {
                    const arg = this.#getMessageId( path.node.arguments[1], { file, "line": path.node.loc.start.line, "column": path.node.loc.start.column } );
                    if ( !arg.msgId ) return;

                    message.pluralId = arg.msgId;
                    if ( arg.hasTemplate ) message.hasTemplate = true;
                }

                const notes = [];

                // extract notes
                for ( const node of path.node.arguments ) {
                    if ( node.leadingComments ) {
                        notes.push( node.leadingComments
                            .map( block => block.value.trim() )
                            .filter( value => value )
                            .join( " " ) );
                    }

                    if ( node.trailingComments ) {
                        notes.push( node.trailingComments
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
                    const references = `${file}:${path.node.loc.start.line}:${path.node.loc.start.column}`;

                    if ( messages[message.id].references ) {
                        messages[message.id].references += " " + references;
                    }
                    else {
                        messages[message.id].references = references;
                    }
                }

                // notes
                if ( notes.length ) {
                    if ( messages[message.id].notes ) {
                        messages[message.id].notes += "\n" + notes.join( "\n" );
                    }
                    else {
                        messages[message.id].notes = notes.join( "\n" );
                    }
                }
            },
        } );
    }

    #getMessageId ( node, location ) {
        var msgId, hasTemplate, comment;

        if ( node.type === "StringLiteral" ) {
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
