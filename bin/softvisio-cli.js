#!/usr/bin/env node

const cli = require( "@softvisio/core/cli" );

const Vim = require( "@softvisio/cli/commands/vim" );
const Wiki = require( "@softvisio/cli/commands/wiki" );
const Icons = require( "@softvisio/cli/commands/icons" );
const Lint = require( "@softvisio/cli/commands/lint" );
const Release = require( "@softvisio/cli/commands/release" );

class App {
    static cli () {
        return {
            "summary": "Softvisio build tool.",
            "commands": {
                "vim": Vim,
                "wiki": Wiki,
                "icons": Icons,
                "lint": Lint,
                "release": Release,
            },
        };
    }
}

cli( App );
