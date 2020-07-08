module.exports = class {
    static cli () {
        return {
            "summary": "Build and push docker images.",
            "options": {
                "remove": {
                    "summary": "Remove images after build.",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "push": {
                    "summary": "Do not push images.",
                    "default": true,
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
        const { throwError, getProjectRoot } = require( "../../util" ),
            Git = require( "../../git" ),
            child_process = require( "child_process" ),
            fs = require( "@softvisio/core/fs" );

        var root = getProjectRoot(),
            dockerRoot = root;

        if ( !root ) throwError( "Unable to find project root." );

        // check Dockerfile
        if ( !fs.existsSync( root + "/Dockerfile" ) ) throwError( `"Dockerfile" not found.` );

        // read .docker.yaml
        if ( !fs.existsSync( root + "/.docker.yaml" ) ) throwError( `".docker.yaml" not found.` );
        const dockerConfig = fs.config.read( root + "/.docker.yaml" );
        if ( !dockerConfig.name || !dockerConfig.namespace ) throwError( `Required data is missed in ".docker.yaml".` );

        const repoId = dockerConfig.namespace + "/" + dockerConfig.name;

        var git = new Git( root );

        // clone git repo
        if ( process.cli.arguments.tag ) {
            process.stdout.write( "Cloning ... " );

            // TODO temdir
            dockerRoot = "/tmp/123-REMOVE";

            const res = await git.run( "clone", "--quiet", root, dockerRoot, "--branch", process.cli.arguments.tag );

            if ( !res.ok ) throwError( res );

            console.log( res + "" );

            git = new Git( dockerRoot );
        }

        const id = await git.getId();
        if ( !id.ok ) throwError( id );
        if ( !id.data.hash ) throwError( `Unable to identify current changeset.` );

        const images = [],
            dirtyTag = id.data.isDirty ? ".dirty" : "";

        // current branch
        if ( id.data.branch ) images.push( `${repoId}:${id.data.branch}${dirtyTag}` );

        // tags
        for ( const tag of id.data.tags ) {
            images.push( `${repoId}:${tag}${dirtyTag}` );
        }

        // detached head
        if ( !images.length ) images.push( `${repoId}:${id.data.hashShort}${dirtyTag}` );

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
        }
        catch ( e ) {
            throwError( "Terminated." );
        }

        // TODO remove temp dir

        // push images
        if ( process.cli.options.push ) {
            for ( const image of images ) {
                try {
                    child_process.execFileSync( "docker", ["push", image], { "stdio": "inherit" } );
                }
                catch ( e ) {
                    throwError( "Terminated." );
                }
            }
        }

        // remove images
        if ( process.cli.options.remove ) {
            for ( const image of images ) {
                try {
                    child_process.execFileSync( "docker", ["rmi", image], { "stdio": "inherit" } );
                }
                catch ( e ) {}
            }
        }
    }
};
