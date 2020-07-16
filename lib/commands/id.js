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

        const pkg = require( root + "/package.json" );

        console.log( `
name: ${ansi.hl( pkg.name )}
branch: ${ansi.hl( id.data.branch )}
current release: ${id.data.release}
latest release: ${Object.keys( releases.data )[0]}
is dirty: ${id.data.isDirty ? ansi.warn( " DIRTY " ) : ansi.ok( " COMMITED " )}
push status:
${Object.keys( pushStatus.data )
        .map( branch => "    " + branch + ": " + ( pushStatus.data[branch] ? ansi.warn( " " + pushStatus.data[branch] + " " ) : ansi.ok( " PUSHED " ) ) )
        .join( "\n" )}
unreleased changes: ${id.data.releaseDistance ? ansi.warn( " " + id.data.releaseDistance + " " ) : ansi.ok( " RELEASED " )}
        `.trim() );
    }
};
