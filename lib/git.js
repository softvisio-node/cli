import CoreGit from "#core/api/git";
import GitChangelog from "./git/changelog.js";

export default class Git extends CoreGit {

    // public
    async getChangelog ( { commit, release, stable } = {} ) {
        var res;

        if ( release ) {
            res = await this.getCurrentRelease( {
                commit,
                stable,
                "changes": true,
            } );
            if ( !res.ok ) return res;

            return result(
                200,
                new GitChangelog( res.data.changes, {
                    "upstream": this.upstream,
                    "previousRelease": res.data.currentRelease,
                    "currentRelease": null,
                } )
            );
        }
        else {
            res = await this.getRelease( {
                commit,
                stable,
                "changes": true,
            } );
            if ( !res.ok ) return res;

            return result(
                200,
                new GitChangelog( res.data.changes, {
                    "upstream": this.upstream,
                    "previousRelease": res.data.previousRelease,
                    "currentRelease": res.data.currentRelease,
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
