#!/usr/bin/env node

const cli = require( "@softvisio/core/cli" );

const Vim = require( "@softvisio/cli/commands/vim" );
const Wiki = require( "@softvisio/cli/commands/wiki" );
const Icons = require( "@softvisio/cli/commands/icons" );
const Lint = require( "@softvisio/cli/commands/lint" );
const Release = require( "@softvisio/cli/commands/release" );
const Ls = require( "@softvisio/cli/commands/ls" );
const Log = require( "@softvisio/cli/commands/log" );
const Docker = require( "@softvisio/cli/commands/docker" );
const GitPreCommitHook = require( "@softvisio/cli/commands/git-pre-commit-hook" );

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
                "ls": Ls,
                "log": Log,
                "docker": Docker,
                "git-pre-commit-hook": GitPreCommitHook,
            },
        };
    }
}

cli( App );
