import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {};
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Unable to find project root.` );

        const { ansi } = await import( "#core/text" ),
            git = rootPackage.git;

        let state = await git.getState();
        if ( !state.ok ) this._throwError( `Git error.` );
        state = state.data;

        const upstream = await git.getUpstream();

        const pkg = rootPackage.config;

        console.log( `
Name:               ${ansi.hl( pkg.name )}
Private:            ${pkg.private ? ansi.error( " PRIVATE " ) : ansi.ok( " PUBLIC " )}
Next Version:       ${ansi.hl( state.releases.next.isNull ? "-" : state.releases.next )}
Current Version:    ${ansi.hl( state.currentVersion.isNull ? "-" : state.currentVersion )}
Branch:             ${ansi.hl( state.branch )}
Is Dirty:           ${state.isDirty ? ansi.error( " DIRTY " ) : ansi.ok( " COMMITED " )}
Not Pushed Changes: ${Object.keys( state.pushStatus )
        .map( branch => branch + ":" + ( state.pushStatus[branch] ? ansi.error( " " + state.pushStatus[branch] + " " ) : ansi.ok( " PUSHED " ) ) )
        .join( ", " )}
Unreleased Changes: ${state.currentVersionDistance ? ( !state.currentVersion.isNull ? ansi.error( " " + state.currentVersionDistance + " " ) : state.currentVersionDistance ) : ansi.ok( " RELEASED " )}
        `.trim() );

        if ( upstream ) {
            console.log();

            console.log( `
Home:               ${ansi.hl( upstream.homeURL )}
Issues:             ${ansi.hl( upstream.issuesURL )}
Wiki:               ${ansi.hl( upstream.wikiURL )}
Docs:               ${ansi.hl( upstream.docsURL || "-" )}

Clone:              ${ansi.hl( upstream.sshCloneURL )}
Clone Wiki:         ${ansi.hl( upstream.sshWikiCloneURL )}
            `.trim() );
        }
    }
}
