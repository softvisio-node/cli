const Command = require( "../../command" );

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Clone wiki.",
        };
    }

    async run () {
        const root = this._getProjectRoot();

        if ( !root ) this._throwError( `Unable to find project root.` );

        const wikiRoot = root + "/" + "wiki";
        const fs = require( "fs" );

        if ( fs.existsSync( wikiRoot ) ) this._throwError( `Wiki is already cloned.` );

        const git = this._getGit( root );

        process.stdout.write( `Cloning wiki ... ` );
        const res = await git.run( "clone", "--quiet", ( await git.getUpstream() ).getWikiCloneUrl(), wikiRoot );
        if ( !res.ok ) this._throwError( res );
        console.log( res + "" );
    }
};
