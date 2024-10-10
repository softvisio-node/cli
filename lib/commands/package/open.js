import openUrl from "#core/open-url";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {};
    }

    // public
    async run () {
        const pkg = this._findGitPackage();

        if ( !pkg ) return result( [ 500, `Unable to find package` ] );

        const git = pkg.git,
            upstream = git.upstream;

        if ( !upstream ) return result( [ 500, `Upstream git repository was not found` ] );

        const homeUrl = upstream.homeUrl;

        openUrl( homeUrl );
    }
}
