import Command from "#lib/command";

export default class extends Command {
    static cli () {
        return {
            "title": "open docs site in browser",
        };
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Unable to find project root.` );

        const git = rootPackage.git,
            upstream = await git.getUpstream();

        if ( !upstream ) this._throwError( `Upstream git repository wasn't found.` );

        const docsURL = upstream.docsURL,
            child_process = await import( "child_process" );

        if ( process.platform === "win32" ) {
            child_process.exec( "start " + docsURL );
        }
        else {
            this._throwError( `Currently works only under windows.` );
        }
    }
}
