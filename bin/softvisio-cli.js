#!/usr/bin/env node

import "@softvisio/core";

import cli from "@softvisio/core/cli";

import Rpc from "#lib/commands/rpc.js";
import Wiki from "#lib/commands/wiki.js";
import Icons from "#lib/commands/icons.js";
import Lint from "#lib/commands/lint.js";
import Publish from "#lib/commands/publish.js";
import Ls from "#lib/commands/ls.js";
import Log from "#lib/commands/log.js";
import Docker from "#lib/commands/docker.js";
import Git from "#lib/commands/git.js";
import Status from "#lib/commands/status.js";

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

cli( App );
