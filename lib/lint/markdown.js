import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";

const parserOptions = {

    // "extensions": [ gfmAutolinkLiteral ],
    // "mdastExtensions": [ gfmAutolinkLiteralFromMarkdown ],
};

export default class Markdown {

    // public
    transform ( source, { handlers } = {} ) {
        const ast = fromMarkdown( source, parserOptions );

        return toMarkdown( ast, {
            handlers,
        } );
    }

    toMarkdown ( node ) {
        return toMarkdown( node );
    }
}
