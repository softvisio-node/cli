#!/usr/bin/env node

import "@softvisio/core";

import cli from "@softvisio/core/cli";

import Rpc from "#lib/commands/rpc.cjs";
import Wiki from "#lib/commands/wiki.cjs";
import Icons from "#lib/commands/icons.cjs";
import Lint from "#lib/commands/lint.cjs";
import Publish from "#lib/commands/publish.cjs";
import Ls from "#lib/commands/ls.cjs";
import Log from "#lib/commands/log.cjs";
import Docker from "#lib/commands/docker.cjs";
import Git from "#lib/commands/git.cjs";
import Status from "#lib/commands/status.cjs";

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
