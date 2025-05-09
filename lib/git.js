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

        const args = [ "log", "--pretty=format:%H%n%h%n%cI%n%s%n%b%x00" ];

        if ( tag ) args.push( tag + "..HEAD" );

        const res = await this.exec( args );

        if ( !res.ok ) {

            // no commits found
            if ( res.data.includes( "does not have any commits yet" ) ) {
                return result( 200, new Changes() );
            }
            else {
                return res;
            }
        }

        const commits = [];

        if ( res.data ) {
            for ( const commit of res.data.split( "\0" ) ) {
                const [ hash, abbrev, date, message, ...body ] = commit.trim().split( "\n" );

                if ( !hash ) continue;

                commits.push( {
                    message,
                    "body": body.join( "\n" ).trim(),
                    hash,
                    abbrev,
                    date,
                } );
            }
        }

        return result( 200, new Changes( commits ) );
    }

    async createObject ( data ) {
        const res = await this.exec( [ "hash-object", "-w", "--stdin" ], {
            "input": data,
        } );

        if ( res.ok ) res.data = res.data.trim();

        return res;
    }
}
