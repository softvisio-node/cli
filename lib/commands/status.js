import ansi from "#core/ansi";
import Command from "#lib/command";

export default class extends Command {

    // static
    static cli () {
        return {};
    }

    // public
    async run () {
        const pkg = this._findGitRoot();
        if ( !pkg ) return result( [ 500, "Unable to find git root" ] );

        const git = pkg.git;

        var res;

        res = await git.getStatus( {
            "branchStatus": true,
        } );
        if ( !res.ok ) return res;
        const status = res.data;

        const upstream = git.upstream;

        const config = pkg.config;

        console.log( `
Name:                    ${ ansi.hl( config?.name || "-" ) }
Releasable:              ${ pkg.isReleaseEnabled
    ? ansi.ok( " RELEASABLE " )
    : ansi.error( " NOT RELEASABLE " ) }
Private:                 ${ pkg.isPrivate
    ? ansi.error( " PRIVATE " )
    : ansi.ok( " PUBLIC " ) }
Branch:                  ${ ansi.hl( status.head.branch ) }
Current release:         ${ ansi.hl( status.currentRelease || "-" ) }
Stable release (latest): ${ ansi.hl( status.releases.lastStableRelease || "-" ) }
Last release (next):     ${ ansi.hl( status.releases.lastRelease || "-" ) }
Is dirty:                ${ status.isDirty
    ? ansi.error( " DIRTY " )
    : ansi.ok( " COMMITED " ) }
Branch sync. status:     ${ Object.keys( status.branchStatus )
    .map( branch => branch + ": " + this.#getBranchStatusText( status.branchStatus[ branch ] ) )
    .join( "\n" + " ".repeat( 25 ) ) }
Unreleased commits:      ${ pkg.isReleaseEnabled
    ? ( status.currentReleaseDistance
        ? ansi.error( " " + status.currentReleaseDistance + " " )
        : ansi.ok( " RELEASED " ) )
    : "-" }
        `.trim() );

        if ( upstream ) {
            console.log();

            console.log( `
Home:                    ${ ansi.hl( upstream.homeUrl ) }
Issues:                  ${ ansi.hl( upstream.issuesUrl ) }
Wiki:                    ${ ansi.hl( upstream.wikiUrl ) }
Docs:                    ${ ansi.hl( pkg.docsUrl || "-" ) }

Clone:                   ${ ansi.hl( upstream.sshCloneUrl ) }
Clone wiki:              ${ ansi.hl( upstream.wikiSshCloneUrl ) }
            `.trim() );
        }

        const localizationStatus = pkg.localization.status();

        if ( localizationStatus.data ) {
            console.log( "\nLocalization status:\n" );

            for ( const [ poFilePath, isTranslated ] of Object.entries( localizationStatus.data ) ) {
                console.log( isTranslated
                    ? " OK    "
                    : ansi.error( " FUZZY " ), poFilePath );
            }
        }
    }

    // private
    #getBranchStatusText ( status ) {
        if ( status.upstream ) {
            if ( status.synchronized ) {
                return "OK";
            }
            else {
                const text = [];

                if ( status.ahead ) {
                    text.push( "push " + ansi.error( ` ${ status.ahead } ` ) );
                }

                if ( status.behind ) {
                    text.push( "pull " + ansi.error( ` ${ status.behind } ` ) );
                }

                return text.join( ", " );
            }
        }
        else {
            return "NOT TRACKED";
        }
    }
}
