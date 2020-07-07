const { throwError, isProjectRoot } = require( "../util" );

module.exports = class {
    static cli () {
        return {
            "summary": "List projects in workspace.",
        };
    }

    async run () {
        const fs = require( "@softvisio/core/fs" ),
            Git = require( "../git" ),
            workspace = process.env.WORKSPACE;

        if ( !workspace ) throwError( `"WORKSPACE" environment variable is not defined.` );

        const projects = ( await fs.promises.readdir( workspace, { "withFileTypes": true } ) )
            .filter( entry => entry.isDirectory() )
            .map( entry => workspace + "/" + entry.name )
            .filter( entry => isProjectRoot( entry ) );

        for ( const root of projects ) {
            const pkg = require( root + "/package.json" ),
                git = new Git( root ),
                id = await git.getId();

            console.log( pkg.name + " " + id.data.isDirty );
        }
    }
};
