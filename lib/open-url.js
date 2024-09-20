import { spawn } from "node:child_process";

const commands = {
    "darwin": "open",
    "linux": "xdg-open",
    "win32": "explorer.exe",
};

export default function openUrl ( url ) {
    if ( !commands[ process.platform ] ) return;

    spawn( commands[ process.platform ], [ url ], {
        "stdio": false,
        "detached": true,
    } );
}
