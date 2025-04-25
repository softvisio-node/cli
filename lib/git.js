import _Git from "#core/api/git";
import Semver from "#core/semver";
import Changes from "#lib/git/changes";

export default class Git extends _Git {

    // public
    async getChanges ( tag ) {
        if ( tag instanceof Semver ) {
            if ( tag.isNull ) tag = null;
            else tag = tag.toVersionString();
        }

        const args = [ "log", "--pretty=format:%H%x00%h%x00%cI%x00%s" ];

        if ( tag ) args.push( tag + "..HEAD" );

        const res = await this.run( args );

        if ( !res.ok ) return res;

        const commits = [];

        if ( res.data ) {
            for ( const commit of res.data.split( "\n" ) ) {
                const [ hash, abbrev, date, message ] = commit.split( "\0" );

                commits.push( {
                    message,
                    hash,
                    abbrev,
                    date,
                } );
            }
        }

        return result( 200, new Changes( commits ) );
    }

    async createObject ( data ) {
        const res = await this.run( [ "hash-object", "-w", "--stdin" ], {
            "input": data,
        } );

        if ( res.ok ) res.data = res.data.trim();

        return res;
    }
}
