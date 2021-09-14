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

        let status = await git.getStatus();
        if ( !status.ok ) this._throwError( `Git error.` );
        status = status.data;

        const upstream = await git.getUpstream();

        const pkg = rootPackage.config;

        console.log( `
Name:                    ${ansi.hl( pkg.name )}
Private:                 ${pkg.private ? ansi.error( " PRIVATE " ) : ansi.ok( " PUBLIC " )}
Branch:                  ${ansi.hl( status.branch )}
Current release:         ${ansi.hl( status.currentVersion.isNull ? "-" : status.currentVersion )}
Stable release (latest): ${ansi.hl( status.releases.latest.isNull ? "-" : status.releases.latest )}
Last release (next):     ${ansi.hl( status.releases.next.isNull ? "-" : status.releases.next )}
Is dirty:                ${status.isDirty ? ansi.error( " DIRTY " ) : ansi.ok( " COMMITED " )}
Not pushed changes:      ${Object.keys( status.pushStatus )
        .map( branch => branch + ":" + ( status.pushStatus[branch] ? ansi.error( " " + status.pushStatus[branch] + " " ) : ansi.ok( " PUSHED " ) ) )
        .join( ", " )}
Unreleased changes:      ${status.currentVersionDistance ? ( !status.currentVersion.isNull ? ansi.error( " " + status.currentVersionDistance + " " ) : status.currentVersionDistance ) : ansi.ok( " RELEASED " )}
        `.trim() );

        if ( upstream ) {
            console.log();

            console.log( `
Home:                    ${ansi.hl( upstream.homeURL )}
Issues:                  ${ansi.hl( upstream.issuesURL )}
Wiki:                    ${ansi.hl( upstream.wikiURL )}
Docs:                    ${ansi.hl( upstream.docsURL || "-" )}

Clone:                   ${ansi.hl( upstream.sshCloneURL )}
Clone wiki:              ${ansi.hl( upstream.sshWikiCloneURL )}
            `.trim() );
        }
    }
}
