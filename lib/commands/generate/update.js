import Command from "#lib/command";
import childProcess from "child_process";

export default class extends Command {
    static cli () {
        return {
            "options": {
                "force": {
                    "description": `force overwrite metadata`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
        };
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Unable to find root package` );

        const git = rootPackage.git,
            upstream = await git.getUpstream();

        if ( !upstream ) this._throwError( `Upstream git repository wasn't found.` );

        const wikiUrl = upstream.wikiUrl;

        if ( process.platform === "win32" ) {
            childProcess.exec( "start " + wikiUrl );
        }
        else {
            this._throwError( `Currently works only under windows.` );
        }
    }
}
