import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";
import { toString } from "mdast-util-to-string";

const fromMarkdownOptions = {};

const toMarkdownOptions = {
    "resourceLink": true,
};

export default class Markdown {

    // public
    transform ( source, { handlers } = {} ) {
        const ast = fromMarkdown( source, fromMarkdownOptions );

        return toMarkdown( ast, {
            ...toMarkdownOptions,
            handlers,
        } );
    }

    nodeToString ( node ) {
        return toString( node );
    }

    nodeToMarkdown ( node ) {
        return toMarkdown( node, {
            ...toMarkdownOptions,
        } );
    }
}
