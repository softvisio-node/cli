import Command from "#lib/command";

export default class extends Command {
    static cli () {
        return {};
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Unable to find project root.` );

        const git = rootPackage.git,
            upstream = await git.getUpstream();

        if ( !upstream ) this._throwError( `Upstream git repository wasn't found.` );

        const wikiUrl = upstream.wikiURL,
            childProcess = await import( "childProcess" );

        if ( process.platform === "win32" ) {
            childProcess.exec( "start " + wikiUrl );
        }
        else {
            this._throwError( `Currently works only under windows.` );
        }
    }
}
