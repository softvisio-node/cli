module.exports = class {
    static cli () {
        return {
            "summary": "Prints changelog since the latest release.",
        };
    }

    async run () {
        const { throwError, getProjectRoot } = require( "../util" ),
            Git = require( "../git" ),
            root = getProjectRoot();

        if ( !root ) throwError( `Project root wasn't found.` );

        const git = new Git( root ),
            id = await git.getId(),
            log = await git.getLog( id.data.release );

        console.log( `Changelog since release "${id.data.release || "-"}"\n` );

        for ( const line of log.data ) {
            console.log( "  - " + line );
        }
    }
};
