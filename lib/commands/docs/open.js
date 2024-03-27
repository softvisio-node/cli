import Command from "#lib/command";
import Browser from "#core/browser";

export default class extends Command {
    static cli () {
        return {};
    }

    async run () {
        const rootPackage = this._findGitPackage();

        if ( !rootPackage ) this._throwError( `Unable to find root package` );

        const git = rootPackage.git,
            upstream = git.upstream;

        if ( !upstream ) this._throwError( `Upstream git repository wasn't found` );

        const docsUrl = upstream.docsUrl;

        new Browser( docsUrl, { "defaultBrowser": true, "detached": true } );
    }
}
