const Command = require( "../command" );

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Prints project status.",
        };
    }

    async run () {
        const root = this._getProjectRoot();

        if ( !root ) this._throwError( `Unable to find project root.` );

        const ansi = require( "@softvisio/core/ansi" ),
            git = this._getGit( root );

        const id = await git.getId();
        if ( !id.ok ) this._throwError( `Git error.` );

        const upstream = await git.getUpstream();

        const pkg = require( root + "/package.json" );

        console.log( `
Name:               ${ansi.hl( pkg.name )}
Latest Release:     ${ansi.hl( id.data.latestRelease || "-" )}
Current Release:    ${ansi.hl( id.data.release || "-" )}
Branch:             ${ansi.hl( id.data.branch )}
Is Dirty:           ${id.data.isDirty ? ansi.error( " DIRTY " ) : ansi.ok( " COMMITED " )}
Not Pushed Changes: ${Object.keys( id.data.pushStatus )
        .map( branch => branch + ":" + ( id.data.pushStatus[branch] ? ansi.error( " " + id.data.pushStatus[branch] + " " ) : ansi.ok( " PUSHED " ) ) )
        .join( ", " )}
Unreleased Changes: ${id.data.releaseDistance ? ( id.data.release ? ansi.error( " " + id.data.releaseDistance + " " ) : id.data.releaseDistance ) : ansi.ok( " RELEASED " )}
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
