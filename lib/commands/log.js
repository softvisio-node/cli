const Command = require( "../command" );

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Prints changelog since the latest release.",
        };
    }

    async run () {
        const root = this._getProjectRoot();

        if ( !root ) this._throwError( `Project root wasn't found.` );

        const git = this._getGit( root ),
            id = await git.getId(),
            log = await git.getLog( id.data.currentRelease );

        console.log( `Changelog since release "${id.data.currentRelease || "-"}"\n` );

        for ( const line of log.data ) {
            console.log( "  - " + line );
        }
    }
};
