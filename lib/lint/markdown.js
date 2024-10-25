import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown, gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import { gfm } from "micromark-extension-gfm";

const fromMarkdownOptions = {
    "extensions": [ gfm() ],
    "mdastExtensions": [ gfmFromMarkdown() ],
};

const toMarkdownOptions = {
    "extensions": [ gfmToMarkdown() ],
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

    toMarkdown ( node ) {
        return toMarkdown( node, {
            ...toMarkdownOptions,
        } );
    }
}
