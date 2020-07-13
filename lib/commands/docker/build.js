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
                "single": {
                    "summary": "If <tag> is specified build only this tag.",
                    "default": false,
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
                    "summary": "Git branch or tag. If not defined image will be built from the current working copy.",
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
        if ( !dockerConfig.name || !dockerConfig.namespace ) this._throwError( `Required data is missed in ".docker.yaml".` );

        const repoId = dockerConfig.namespace + "/" + dockerConfig.name;

        var git = this._getGit( root );

        // clone git repo
        if ( process.cli.arguments.tag ) {
            process.stdout.write( `Cloning branch / tag "${process.cli.arguments.tag}" ... ` );

            dockerRoot = fs.tmp.dir();

            const res = await git.run( "clone", "--quiet", root, dockerRoot, "--branch", process.cli.arguments.tag );

            if ( !res.ok ) this._throwError( res );

            console.log( res + "" );

            git = this._getGit( dockerRoot );
        }

        // check Dockerfile
        if ( !fs.existsSync( dockerRoot + "/Dockerfile" ) ) this._throwError( `"Dockerfile" not found.`, dockerRoot );

        const id = await git.getId();
        if ( !id.ok ) this._throwError( id, dockerRoot );
        if ( !id.data.hash ) this._throwError( `Unable to identify current changeset.`, dockerRoot );

        const images = [];
        let dirtyTag = "";

        // working tree is dirty
        if ( id.data.isDirty ) {
            if ( !process.cli.options.force && ( await confirm( "Working tree is dirty. Continue?", ["n", "y"] ) ) === "n" ) this._throwError( "Terminated.", dockerRoot );

            dirtyTag = ".dirty";
        }

        // single tag mode
        if ( process.cli.options.single && process.cli.arguments.tag ) {
            images.push( `${repoId}:${process.cli.arguments.tag}${dirtyTag}` );
        }

        // multiple tags mode
        else {

            // current branch
            if ( id.data.branch ) images.push( `${repoId}:${id.data.branch}${dirtyTag}` );

            // tags
            for ( const tag of id.data.tags ) {
                images.push( `${repoId}:${tag}${dirtyTag}` );
            }

            // detached head
            if ( !images.length ) images.push( `${repoId}:${id.data.hashShort}${dirtyTag}` );
        }

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
