const Command = require( "../command" );

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Shows project information.",
        };
    }

    async run () {
        const root = this._getProjectRoot();

        if ( !root ) this._throwError( `Unable to find project root.` );

        const ansi = require( "ansi-colors" ),
            git = this._getGit( root );

        ansi.theme( {
            "hl": ansi.bold.white,
            "ok": ansi.bgGreen.bold.white,
            "warn": ansi.bgRed.bold.white,
        } );

        const id = await git.getId();
        if ( !id.ok ) this._throwError( `Git error.` );

        const releases = await git.getReleases();
        if ( !releases.ok ) this._throwError( `Git error.` );

        const pushStatus = await git.getPushStatus();
        if ( !pushStatus.ok ) this._throwError( `Git error.` );

        const upstream = await git.getUpstream();

        const pkg = require( root + "/package.json" );

        console.log( `
Name:               ${ansi.hl( pkg.name )}
Latest Release:     ${ansi.hl( Object.keys( releases.data )[0] || "-" )}
Current Release:    ${ansi.hl( id.data.release || "-" )}
Branch:             ${ansi.hl( id.data.branch )}
Is Dirty:           ${id.data.isDirty ? ansi.warn( " DIRTY " ) : ansi.ok( " COMMITED " )}
Not Pushed Changes: ${Object.keys( pushStatus.data )
        .map( branch => branch + ":" + ( pushStatus.data[branch] ? ansi.warn( " " + pushStatus.data[branch] + " " ) : ansi.ok( " PUSHED " ) ) )
        .join( ", " )}
Unreleased Changes: ${id.data.releaseDistance ? ansi.warn( " " + id.data.releaseDistance + " " ) : ansi.ok( " RELEASED " )}
        `.trim() );

        if ( upstream ) {
            console.log();

            console.log( `
Home:               ${ansi.hl( upstream.getHomeUrl() )}
Issues:             ${ansi.hl( upstream.getIssuesUrl() )}
Wiki:               ${ansi.hl( upstream.getWikiUrl() )}

Clone:              ${ansi.hl( upstream.getCloneUrl() )}
Clone Wiki:         ${ansi.hl( upstream.getWikiCloneUrl() )}
            `.trim() );
        }
    }
};
