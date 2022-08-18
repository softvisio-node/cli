import Command from "#lib/command";
import Browser from "#core/browser";

export default class extends Command {
    static cli () {
        return {};
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Unable to find root package` );

        const git = rootPackage.git,
            upstream = await git.getUpstream();

        if ( !upstream ) this._throwError( `Upstream git repository wasn't found` );

        const wikiUrl = upstream.wikiUrl;

        new Browser( wikiUrl, { "detached": true } );
    }
}
