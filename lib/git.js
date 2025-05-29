import CoreGit from "#core/api/git";
import GitChanges from "#core/api/git/changes";
import GitChangelog from "./git/changelog.js";

export default class Git extends CoreGit {

    // public
    async getChangelog ( { commit, stable, release } = {} ) {
        var res;

        res = await this.getRelease( {
            commit,
            stable,
        } );
        if ( !res.ok ) return res;

        const previousRelease = res.data.previousRelease,
            currentRelease = res.data.currentRelease;

        var changes;

        // get changes
        if ( !release || res.data.unreleasedCommits ) {
            res = await this.getChanges( [ previousRelease, currentRelease
                ? currentRelease.versionString + "~1"
                : null ] );

            if ( !res.ok ) return res;

            changes = res.data;
        }
        else {
            changes = new GitChanges();
        }

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
