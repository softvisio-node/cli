import Command from "../command.js";

export default class extends Command {
    static cli () {
        return {};
    }

    async run () {
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( `Unable to find root package` );

        const git = rootPackage.git,
            status = await git.getStatus(),
            changes = ( await git.getChanges( status.data.currentVersion ) ).data;

        console.log( `Changelog since the version: ${ status.data.currentVersion.isNull ? "-" : status.data.currentVersion }\n` );

        for ( const commit of changes.changes ) {
            console.log( "-   " + commit.subject );
        }

        if ( changes.changes.length ) console.log( "" );
        changes.report();
    }
}
