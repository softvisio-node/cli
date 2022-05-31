import Command from "#lib/command";
import fs from "fs";
import Locale from "#core/locale";
import babelParser from "@babel/parser";
import babelTraverse from "@babel/traverse";

export default class extends Command {
    static cli () {
        return {
            "description": `PoEdit extractor settings:
    Extensions: *.js;*.mjs;*.cjs;*.vue
    Command: softvisio-cli localization gettext --output %o %F
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
                if ( script ) this.#parse( script, messages, "module" );

                // template
                const template = content.match( /<template>(.+)<\/template>/ms )?.[1];
                if ( template ) {
                    for ( const tag of template.matchAll( /<[^>]+>/g ) ) {
                        for ( const attrobute of tag[0].matchAll( /:[a-zA-Z0-9-_]+=(["'])([^\1]+?)\1/g ) ) {
                            if ( !attrobute[2].includes( "i18n`" ) && !attrobute[2].includes( "i18p`" ) ) continue;

                            console.log( attrobute[2] );

                            this.#parse( attrobute[2], messages, "module" );
                        }
                    }
                }
            }

            // .cjs
            else if ( file.endsWith( ".cjs" ) ) {
                this.#parse( content, messages, "script" );
            }

            // .js, .mjs
            else if ( file.endsWith( ".js" ) || file.endsWith( ".mjs" ) ) {
                this.#parse( content, messages, "module" );
            }
        }

        const locale = new Locale( { messages } );

        fs.writeFileSync( process.cli.options.output, locale.toPoFile() );
    }

    // private
    #parse ( string, messages, sourceType ) {
        try {
            var ast = babelParser.parse( string, { sourceType } );
        }
        catch ( e ) {
            this._throwError( e );
        }

        babelTraverse.default( ast, {
            TaggedTemplateExpression ( path ) {
                let tag;

                if ( path.node.tag.type === "Identifier" ) {
                    tag = path.node.tag.name;
                }
                else if ( path.node.tag.type === "MemberExpression" ) {
                    tag = path.node.tag.property.name;
                }

                if ( tag === "i18n" ) {
                    const message = path.node.quasi.quasis.map( node => node.value.cooked ).join( "${n}" );

                    messages[message] = null;
                }
                else if ( tag === "i18p" ) {
                    const message = path.node.quasi.quasis.map( node => node.value.cooked ).join( "${n}" );

                    messages[message] = [];
                }
            },
        } );
    }
}
