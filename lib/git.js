import CoreGit from "#core/api/git";
import GitChangelog from "./git/changelog.js";

export default class Git extends CoreGit {

    // public
    async getChangelog ( { commitRef, release, stable, commitTypes } = {} ) {
        var res;

        if ( release ) {
            res = await this.getCurrentRelease( {
                commitRef,
                stable,
                "changes": true,
            } );
            if ( !res.ok ) return res;

            // commit is not a branch HEAD
            if ( !res.data.commit.isBranchHead ) {
                return result( [ 400, "Commit should be a branch head" ] );
            }

            return result(
                200,
                new GitChangelog( res.data.changes, {
                    "upstream": this.upstream,
                    "previousRelease": res.data.currentRelease,
                    "currentRelease": null,
                    commitTypes,
                } )
            );
        }
        else {
            res = await this.getReleasesRange( {
                commitRef,
                stable,
                "changes": true,
            } );
            if ( !res.ok ) return res;

            return result(
                200,
                new GitChangelog( res.data.changes, {
                    "upstream": this.upstream,
                    "previousRelease": res.data.startRelease,
                    "currentRelease": res.data.endRelease,
                    commitTypes,
                } )
            );
        }
    }

    async createObject ( data ) {
        const res = await this.exec( [ "hash-object", "-w", "--stdin" ], {
            "input": data,
        } );

        if ( res.ok ) res.data = res.data.trim();

        return res;
    }
}
