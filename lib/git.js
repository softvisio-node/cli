import CoreGit from "#core/api/git";
import Changes from "#lib/git/changes";

export default class Git extends CoreGit {

    // public
    async getChanges ( { startCommit, endCommit } = {} ) {
        const res = await this.getCommits( { startCommit, endCommit } );
        if ( !res.ok ) return res;

        return result( 200, new Changes( res.data ) );
    }

    async createObject ( data ) {
        const res = await this.exec( [ "hash-object", "-w", "--stdin" ], {
            "input": data,
        } );

        if ( res.ok ) res.data = res.data.trim();

        return res;
    }
}
