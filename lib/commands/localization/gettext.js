import Command from "#lib/command";
import fs from "fs";
import Locale from "#core/locale";
import babelParser from "@babel/parser";
import babelTraverse from "@babel/traverse";

export default class extends Command {
    static cli () {
        return {
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

            try {
                var ast = babelParser.parse( content, {
                    "sourceType": "module",
                } );
            }
            catch ( e ) {
                this._throwError( e );
            }

            babelTraverse.default( ast, {
                TaggedTemplateExpression ( path ) {
                    if ( path.node.tag.name === "i18n" ) {
                        const message = path.node.quasi.quasis.map( node => node.value.cooked ).join( "${n}" );

                        messages[message] = null;
                    }
                    else if ( path.node.tag.name === "i18p" ) {
                        const message = path.node.quasi.quasis.map( node => node.value.cooked ).join( "${n}" );

                        messages[message] = [];
                    }
                },
            } );
        }

        const locale = new Locale( { messages } );

        fs.writeFileSync( process.cli.options.output, locale.toPoFile() );
    }
}
