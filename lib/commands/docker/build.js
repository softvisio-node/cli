const Command = require( "../../command" );

module.exports = class extends Command {
    static cli () {
        return {
            "summary": "Build and push docker images.",
            "options": {
                "remove": {
                    "summary": "Remove images after build and push.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "push": {
                    "summary": "Do not push images.",
                    "default": true,
                    "schema": { "type": "boolean" },
                },
                "force": {
                    "summary": `Answer "YES" on all questions.`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "tag": {
                    "summary": "Git branch, tag or hash. If not specified current branch name will be used.",
                    "minItems": 0,
                    "maxItems": 1,
                    "schema": { "type": "string" },
                },
            },
        };
    }

    async run () {
        const child_process = require( "child_process" ),
            fs = require( "@softvisio/core/fs" ),
            { confirm } = require( "@softvisio/core/util" );

        var root = this._getProjectRoot(),
            dockerRoot = root;

        if ( !root ) this._throwError( "Unable to find project root." );

        // read .docker.yaml
        if ( !fs.existsSync( root + "/.docker.yaml" ) ) this._throwError( `".docker.yaml" not found.` );
        const dockerConfig = fs.config.read( root + "/.docker.yaml" );
        if ( !dockerConfig.registry ) this._throwError( `Required data is missed in ".docker.yaml".` );

        var git = this._getGit( root );

        const id = await git.getId();
        if ( !id.ok ) this._throwError( id, dockerRoot );
        if ( !id.data.hash ) this._throwError( `Unable to identify current changeset.`, dockerRoot );

        let tag = process.cli.arguments.tag || id.data.branch;

        const clone = !id.data.isDirty && ( id.data.branch === tag || id.data.hash.indexOf( tag ) === 0 || Object.fromEntries( id.data.tags.map( tag => [tag, true] ) )[tag] ) ? false : true;

        // clone git repo
        if ( clone ) {
            dockerRoot = fs.tmp.dir();

            process.stdout.write( `Cloning ... ` );
            let res = await git.run( "clone", "--quiet", root, dockerRoot );
            if ( !res.ok ) this._throwError( res );
            console.log( res + "" );

            git = this._getGit( dockerRoot );

            process.stdout.write( `Checking out "${tag}" ... ` );
            res = await git.run( "checkout", tag );
            if ( !res.ok ) this._throwError( res );
            console.log( res + "\n" );
        }

        // check Dockerfile
        if ( !fs.existsSync( dockerRoot + "/Dockerfile" ) ) this._throwError( `"Dockerfile" not found.`, dockerRoot );

        // map tags
        if ( dockerConfig.tags && dockerConfig.tags[tag] ) tag = dockerConfig.tags[tag];

        const images = ( Array.isArray( dockerConfig.registry ) ? dockerConfig.registry : [dockerConfig.registry] ).map( registry => `${registry}:${tag}` );

        for ( const image of images ) {
            console.log( `IMAGE: ${image}` );
        }

        // confirm release
        if ( !process.cli.options.force && ( await confirm( "\nContinue build process?", ["n", "y"] ) ) === "n" ) this._throwError( "Terminated.", dockerRoot );

        // build image
        try {
            child_process.execFileSync( "docker",
                [

                    //
                    "build",
                    "--rm",
                    "--force-rm",
                    "--no-cache",
                    "--pull",
                    ...images.map( image => "--tag=" + image ),
                    dockerRoot,
                ],
                { "stdio": "inherit" } );

            // remove temp dir
            if ( dockerRoot.unlinkSync ) dockerRoot.unlinkSync();
        }
        catch ( e ) {
            this._throwError( "Terminated.", dockerRoot );
        }

        // push images
        if ( process.cli.options.push ) {
            for ( const image of images ) {
                try {
                    console.log( `\nPushing: ${image}` );

                    child_process.execFileSync( "docker", ["push", image], { "stdio": "inherit" } );
                }
                catch ( e ) {
                    this._throwError( "Terminated." );
                }
            }
        }

        // remove images
        if ( process.cli.options.remove ) {
            for ( const image of images ) {
                try {
                    console.log( `\nRemoving: ${image}` );

                    child_process.execFileSync( "docker", ["rmi", image], { "stdio": "inherit" } );
                }
                catch ( e ) {}
            }
        }
    }

    _throwError ( msg, dockerRoot ) {

        // remove temp dir
        if ( dockerRoot && dockerRoot.unlinkSync ) dockerRoot.unlinkSync();

        super._throwError( msg );
    }
};
