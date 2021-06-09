import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {
            "title": "Get changelog for unreleased changes",
        };
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Project root wasn't found.` );

        const git = rootPackage.git,
            id = await git.getId(),
            log = await git.getLog( id.data.currentVersion );

        console.log( `Changelog since the version: ${id.data.currentVersion.isNull ? "-" : id.data.currentVersion}\n` );

        for ( const line of log.data ) {
            console.log( "  - " + line );
        }
    }
}
