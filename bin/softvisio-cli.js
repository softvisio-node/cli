#!/usr/bin/env node

require( "@softvisio/core" );
const cli = require( "@softvisio/core/cli" );

const Rpc = require( "@softvisio/cli/commands/rpc" );
const Wiki = require( "@softvisio/cli/commands/wiki" );
const Icons = require( "@softvisio/cli/commands/icons" );
const Lint = require( "@softvisio/cli/commands/lint" );
const Publish = require( "@softvisio/cli/commands/publish" );
const Ls = require( "@softvisio/cli/commands/ls" );
const Log = require( "@softvisio/cli/commands/log" );
const Docker = require( "@softvisio/cli/commands/docker" );
const Git = require( "@softvisio/cli/commands/git" );
const Status = require( "@softvisio/cli/commands/status" );

class App {
    static cli () {
        return {
            "summary": "Softvisio build tool.",
            "commands": {
                "rpc": Rpc,
                "wiki": Wiki,
                "icons": Icons,
                "lint": Lint,
                "publish": Publish,
                "ls": Ls,
                "log": Log,
                "docker": Docker,
                "git": Git,
                "status": Status,
            },
        };
    }
}

( async () => {
    cli( App );
} )();
