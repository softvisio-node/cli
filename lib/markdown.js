import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown, gfmToMarkdown } from "mdast-util-gfm";
import { defaultHandlers, toMarkdown } from "mdast-util-to-markdown";
import { toString } from "mdast-util-to-string";
import { gfm } from "micromark-extension-gfm";
import { CONTINUE, EXIT, SKIP, visit } from "unist-util-visit";
import ansi from "#core/text/ansi";

const fromMarkdownOptions = {
        "extensions": [ gfm() ],
        "mdastExtensions": [ gfmFromMarkdown() ],
    },
    toMarkdownOptions = {
        "extensions": [ gfmToMarkdown() ],
        "resourceLink": false,
        "bullet": "-",
        "emphasis": "_",
        "strong": "*",
        "listItemIndent": "one",
        "rule": "-",
    },
    style = {
        "inlineCode": ansi.cyan,
        "heading": ansi.ok, // ansi.bold,
        "emphasis": ansi.italic,
        "strong": ansi.bold,
        "thematicBreak": ansi.dim,
    };

export default class Markdown {
    #source;
    #ast;

    constructor ( source ) {
        this.#source = source;
    }

    // properties
    get source () {
        return this.#source;
    }

    get defaultHandlers () {
        return defaultHandlers;
    }

    get CONTINUE () {
        return CONTINUE;
    }

    get EXIT () {
        return EXIT;
    }

    get SKIP () {
        return SKIP;
    }

    // public
    toMarkdown ( options = {} ) {
        return toMarkdown( this.#getAst(), {
            ...toMarkdownOptions,
            ...options,
        } );
    }

    toAnsi () {
        const width = process.stdout?.columns || 3;

        return this.toMarkdown( {
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

    visit ( test, callback, { reverse } = {} ) {
        visit( this.#getAst(), test, callback, reverse );

        return this;
    }

    nodeToString ( node ) {
        return toString( node );
    }

    // private
    #getAst () {
        if ( this.#ast == null ) {
            this.#ast = fromMarkdown( this.#source, fromMarkdownOptions );
        }

        return this.#ast;
    }

    #prepareString ( node ) {
        return this.nodeToString( node );
    }
}
