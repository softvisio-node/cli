#!/usr/bin/env node

import "#core/result";
import CLI from "#core/cli";
import ansi from "#core/text/ansi";

const spec = {
    "title": "Softvisio CLI",
    "commands": {
        "ls": {
            "title": "List packages in workspace",
            "module": () => new URL( "../lib/commands/ls.js", import.meta.url ),
        },
        "lint": {
            "short": "L",
            "title": "Lint sources",
            "module": () => new URL( "../lib/commands/lint.js", import.meta.url ),
        },
        "status": {
            "short": "s",
            "title": "Get package status",
            "module": () => new URL( "../lib/commands/status.js", import.meta.url ),
        },
        "log": {
            "short": "l",
            "title": "Get changelog for unreleased changes",
            "module": () => new URL( "../lib/commands/log.js", import.meta.url ),
        },
        "docker": {
            "short": "D",
            "title": "Docker tools",
            "module": () => new URL( "../lib/commands/docker.js", import.meta.url ),
        },
        "docs": {
            "short": "d",
            "title": "Documentation tools",
            "module": () => new URL( "../lib/commands/docs.js", import.meta.url ),
        },
        "package": {
            "short": "p",
            "title": "Package tools",
            "module": () => new URL( "../lib/commands/package.js", import.meta.url ),
        },
        "workspace": {
            "short": "w",
            "title": "Bulk operations with workspace",
            "module": () => new URL( "../lib/commands/workspace.js", import.meta.url ),
        },
        "generate": {
            "short": "g",
            "title": "Generate data",
            "module": () => new URL( "../lib/commands/generate.js", import.meta.url ),
        },
        "lsp": {
            "short": "r",
            "title": "Manage LSP service",
            "module": () => new URL( "../lib/commands/lsp.js", import.meta.url ),
        },
        "debian-repository": {
            "short": false,
            "title": "Debian package repository tools",
            "module": () => new URL( "../lib/commands/debian-repository.js", import.meta.url ),
        },
        "git": {
            "title": "Git tools",
            "module": () => new URL( "../lib/commands/git.js", import.meta.url ),
        },
    },
};

const cli = await CLI.parse( spec );

var res;

try {
    res = result.try( await new cli.module().run(), { "allowUndefined": true } );
}
catch ( e ) {
    res = result.catch( e );

    console.error( ansi.error( " Error: " ), res.statusText );
}

if ( res.ok ) {
    process.exit( 0 );
}
else {
    process.exit( 2 );
}
