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

        const id = await git.getId();
        if ( !id.ok ) this._throwError( `Git error.` );

        const upstream = await git.getUpstream();

        const pkg = rootPackage.config;

        console.log( `
Name:               ${ansi.hl( pkg.name )}
Private:            ${pkg.private ? ansi.error( " PRIVATE " ) : ansi.ok( " PUBLIC " )}
Latest Version:     ${ansi.hl( id.data.lastVersion.isNull ? "-" : id.data.lastVersion )}
Current Version:    ${ansi.hl( id.data.currentVersion.isNull ? "-" : id.data.currentVersion )}
Branch:             ${ansi.hl( id.data.branch )}
Is Dirty:           ${id.data.isDirty ? ansi.error( " DIRTY " ) : ansi.ok( " COMMITED " )}
Not Pushed Changes: ${Object.keys( id.data.pushStatus )
        .map( branch => branch + ":" + ( id.data.pushStatus[branch] ? ansi.error( " " + id.data.pushStatus[branch] + " " ) : ansi.ok( " PUSHED " ) ) )
        .join( ", " )}
Unreleased Changes: ${id.data.currentVersionDistance ? ( !id.data.currentVersion.isNull ? ansi.error( " " + id.data.currentVersionDistance + " " ) : id.data.currentVersionDistance ) : ansi.ok( " RELEASED " )}
        `.trim() );

        if ( upstream ) {
            console.log();

            console.log( `
Home:               ${ansi.hl( upstream.homeURL )}
Issues:             ${ansi.hl( upstream.issuesURL )}
Wiki:               ${ansi.hl( upstream.wikiURL )}

Clone:              ${ansi.hl( upstream.sshCloneURL )}
Clone Wiki:         ${ansi.hl( upstream.sshWikiCloneURL )}
            `.trim() );
        }
    }
}
