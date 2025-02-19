import ansi from "#core/text/ansi";
import Command from "../command.js";

export default class extends Command {

    // static
    static cli () {
        return {};
    }

    // public
    async run () {
        const pkg = this._findGitPackage();

        if ( !pkg ) return result( [ 500, `Unable to find root package` ] );

        const git = pkg.git;

        let status = await git.getStatus();
        if ( !status.ok ) return result( [ 500, `Git error` ] );
        status = status.data;

        const upstream = git.upstream;

        const config = pkg.config;

        console.log( `
Name:                    ${ ansi.hl( config.name ) }
Releasable:              ${ pkg.cliConfig?.releasable
    ? ansi.ok( " RELEASABLE " )
    : ansi.error( " NOT RELEASABLE " ) }
Private:                 ${ config.private
    ? ansi.error( " PRIVATE " )
    : ansi.ok( " PUBLIC " ) }
Branch:                  ${ ansi.hl( status.branch ) }
Current release:         ${ ansi.hl( status.currentVersion.isNull
    ? "-"
    : status.currentVersion ) }
Stable release (latest): ${ ansi.hl( status.releases.lastStableVersion.isNull
    ? "-"
    : status.releases.lastStableVersion ) }
Last release (next):     ${ ansi.hl( status.releases.lastVersion.isNull
    ? "-"
    : status.releases.lastVersion ) }
Is dirty:                ${ status.isDirty
    ? ansi.error( " DIRTY " )
    : ansi.ok( " COMMITED " ) }
Branches ahead/behind:   ${ Object.keys( status.pushStatus )
    .map( branch => branch + ":" + ( status.pushStatus[ branch ].ahead || status.pushStatus[ branch ].behind
        ? ansi.error( " " + status.pushStatus[ branch ].ahead + "/" + status.pushStatus[ branch ].behind + " " )
        : ansi.ok( " OK " ) ) )
    .join( ", " ) }
Unreleased commits:      ${ status.currentVersionDistance
    ? ( !status.currentVersion.isNull
        ? ansi.error( " " + status.currentVersionDistance + " " )
        : status.currentVersionDistance )
    : ansi.ok( " RELEASED " ) }
        `.trim() );

        if ( upstream ) {
            console.log();

            console.log( `
Home:                    ${ ansi.hl( upstream.homeUrl ) }
Issues:                  ${ ansi.hl( upstream.issuesUrl ) }
Wiki:                    ${ ansi.hl( upstream.wikiUrl ) }
Docs:                    ${ ansi.hl( upstream.docsUrl || "-" ) }

Clone:                   ${ ansi.hl( upstream.sshUrl ) }
Clone wiki:              ${ ansi.hl( upstream.wikiSshUrl ) }
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
}
