import Command from "../../command.js";

export default class extends Command {
    static cli () {
        return {
            "summary": "Open wiki in browser.",
        };
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Unable to find project root.` );

        const git = rootPackage.git,
            upstream = await git.getUpstream();

        if ( !upstream ) this._throwError( `Upstream git repository wasn't found.` );

        const wikiUrl = upstream.getWikiUrl(),
            os = await import( "os" ),
            child_process = await import( "child_process" );

        if ( os.platform() === "win32" ) {
            child_process.exec( "start " + wikiUrl );
        }
        else {
            this._throwError( `Currently works only under windows.` );
        }
    }
}
