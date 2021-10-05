import Command from "#lib/command";
import childProcess from "child_process";

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

        const docsUrl = upstream.docsUrl;

        if ( process.platform === "win32" ) {
            childProcess.exec( "start " + docsUrl );
        }
        else {
            this._throwError( `Currently works only under windows.` );
        }
    }
}
