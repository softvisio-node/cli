#!/usr/bin/env node

import "#core";

import CLI from "#core/cli";

const spec = {
    "title": "Softvisio build tool",
    "commands": {
        "docker": {
            "short": "D",
            "title": "docker tools",
            "module": () => new URL( "../lib/commands/docker.js", import.meta.url ),
        },
        "docs": {
            "short": "d",
            "title": "documentation tools",
            "module": () => new URL( "../lib/commands/docs.js", import.meta.url ),
        },
        "git": {
            "title": "git tools",
            "module": () => new URL( "../lib/commands/git.js", import.meta.url ),
        },
        "icons": {
            "title": "generate icons for cordova project",
            "module": () => new URL( "../lib/commands/icons.js", import.meta.url ),
        },
        "lint": {
            "title": "lint sources",
            "module": () => new URL( "../lib/commands/lint.js", import.meta.url ),
        },
        "log": {
            "title": "get changelog for unreleased changes",
            "module": () => new URL( "../lib/commands/log.js", import.meta.url ),
        },
        "ls": {
            "title": "list projects in workspace",
            "module": () => new URL( "../lib/commands/ls.js", import.meta.url ),
        },
        "publish": {
            "title": "release and publish the project",
            "module": () => new URL( "../lib/commands/publish.js", import.meta.url ),
        },
        "rpc": {
            "title": "run RPC service",
            "module": () => new URL( "../lib/commands/rpc.js", import.meta.url ),
        },
        "status": {
            "title": "prints project status",
            "module": () => new URL( "../lib/commands/status.js", import.meta.url ),
        },
        "test": {
            "title": "test suite",
            "module": () => new URL( "../lib/commands/test.js", import.meta.url ),
        },
        "wiki": {
            "title": "wiki tools",
            "module": () => new URL( "../lib/commands/wiki.js", import.meta.url ),
        },
    },
};

const Class = await CLI.parse( spec );

await new Class().run();
