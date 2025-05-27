import CoreGit from "#core/api/git";
import GitChangelog from "./git/changelog.js";

export default class Git extends CoreGit {

    // public
    async getChangelog ( { commit, stable } = {} ) {
        var res;

        res = await this.getRelease( {
            commit,
            stable,
        } );
        if ( !res.ok ) return res;

        const previousRelease = res.data.previousVersion,
            currentRelease = res.data.version;

        // get changes
        res = await this.getChanges( [ previousRelease, currentRelease
            ? currentRelease.versionString + "~1"
            : null ] );
        if ( !res.ok ) return res;
        const changes = res.data;

        return result(
            200,
            new GitChangelog( changes, {
                previousRelease,
                currentRelease,
                "upstream": this.upstream,
            } )
        );
    }

    async createObject ( data ) {
        const res = await this.exec( [ "hash-object", "-w", "--stdin" ], {
            "input": data,
        } );

        if ( res.ok ) res.data = res.data.trim();

        return res;
    }
}
