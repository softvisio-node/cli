import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown, gfmToMarkdown } from "mdast-util-gfm";
import { defaultHandlers, toMarkdown } from "mdast-util-to-markdown";
import { toString } from "mdast-util-to-string";
import { gfm } from "micromark-extension-gfm";
import ansi from "#core/text/ansi";

const fromMarkdownOptions = {
        "extensions": [ gfm() ],
        "mdastExtensions": [ gfmFromMarkdown() ],
    },
    toMarkdownOptions = {
        "extensions": [ gfmToMarkdown() ],
        "resourceLink": false,
    },
    style = {
        "inlineCode": ansi.cyan,
        "heading": ansi.ok, // ansi.bold,
        "emphasis": ansi.italic,
        "strong": ansi.bold,
        "thematicBreak": ansi.dim,
    };

export default class Markdown {

    // properties
    get defaultHandlers () {
        return defaultHandlers;
    }

    // public
    transform ( source, options = {} ) {
        const ast = fromMarkdown( source, fromMarkdownOptions );

        return toMarkdown( ast, {
            ...toMarkdownOptions,
            ...options,
        } );
    }

    nodeToString ( node ) {
        return toString( node );
    }

    toAnsi ( source ) {
        const width = process.stdout?.columns || 3;

        return this.transform( source, {
            "bullet": "-",
            "listItemIndent": "one",
            "handlers": {
                inlineCode ( node ) {
                    return style.inlineCode( this.#prepareString( node ) );
                },

                // link ( node, parent, context ) {
                //     if ( !node.url ) {
                //         return safe( toString( node ) );
                //     }

                //     if ( !hyperlinks || !httpRe.test( node.url ) ) {
                //         return safe( node.url );
                //     }

                //     const label = autolink( node, context )
                //         ? shortUrl( node.url )
                //         : safe( toString( node ) );
                //     return ansiEscapes.link( label, node.url );
                // },
                heading ( node, parent, context ) {
                    const depth = Math.max( Math.min( 6, node.depth || 1 ), 1 );
                    const prefix = "#".repeat( depth );
                    const value = this.#prepareString( node );

                    return style.heading( value
                        ? prefix + " " + value
                        : prefix );
                },
                emphasis ( node, parent, context ) {
                    return style.emphasis( this.#prepareString( node ) );
                },
                strong ( node, parent, context ) {
                    return style.strong( this.#prepareString( node ) );
                },
                thematicBreak ( node, parent, context ) {
                    return style.thematicBreak( "—".repeat( width ) );
                },
            },
        } );
    }

    // private
    #prepareString ( node ) {
        return this.nodeToString( node );
    }
}
