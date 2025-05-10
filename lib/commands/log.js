import Command from "../command.js";

export default class extends Command {

    // static
    static cli () {
        return {};
    }

    // public
    async run () {
        const pkg = this._findGitRoot();
        if ( !pkg ) return result( [ 500, `Unable to find git root` ] );

        const git = pkg.git;

        const status = await git.getStatus( { "pushStatus": false, "releases": false } );
        if ( !status.ok ) return status;

        const changes = await git.getChanges( status.data.currentVersion );
        if ( !changes.ok ) return changes;

        console.log( `Changelog since the version: ${ status.data.currentVersion.isNull
            ? "-"
            : status.data.currentVersion }\n` );

        for ( const change of changes.data ) {
            console.log( "-   " + change.subject );
        }

        if ( changes.data.size ) console.log( "" );

        changes.data.printReport();
    }
}
