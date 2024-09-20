import Command from "#lib/command";
import openUrl from "#core/open-url";

export default class extends Command {
    static cli () {
        return {};
    }

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
