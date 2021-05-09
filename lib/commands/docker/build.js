import Command from "#lib/command";

export default class extends Command {
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

    // XXX when build initiated by git hook:
    // - always clone;
    // - do not set default tag;
    // XXX if cloned by label - we got detached head state, and autobuild branch tags will not work
    async run () {
        const child_process = await import( "child_process" ),
            { "default": fs } = await import( "#core/fs" ),
            { confirm } = await import( "#core/utils" );

        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( "Unable to find project root." );

        var dockerRoot = rootPackage.root;

        // read docker-stack.yaml
        if ( !fs.existsSync( rootPackage.root + "/docker-stack.yaml" ) ) this._throwError( `"docker-stack.yaml" not found.` );
        const dockerConfig = fs.config.read( rootPackage.root + "/docker-stack.yaml" );

        var git = rootPackage.git;

        var id = await git.getId();
        if ( !id.ok ) this._throwError( id, dockerRoot );
        if ( !id.data.hash ) this._throwError( `Unable to identify current changeset.`, dockerRoot );
        id = id.data;

        // define tag to clone
        const tag = process.cli.arguments.tag || dockerConfig["x-build"].default_tag || id.branch;

        const clone = id.isDirty || !( id.branch === tag || id.hash.startsWith( tag ) || id.tags.includes( tag ) );

        // clone git repo
        if ( clone ) {
            dockerRoot = fs.tmp.dir();

            process.stdout.write( `Cloning ... ` );
            let res = await git.run( "clone", "--quiet", rootPackage.root, dockerRoot );
            if ( !res.ok ) this._throwError( res );
            console.log( res + "" );

            const { "default": Git } = await import( "#lib/git" );
            git = new Git( dockerRoot );

            process.stdout.write( `Checking out "${tag}" ... ` );
            res = await git.run( "checkout", tag );
            if ( !res.ok ) this._throwError( res );
            console.log( res + "\n" );

            id = await git.getId();
            if ( !id.ok ) this._throwError( id, dockerRoot );
            id = id.data;
        }

        // check Dockerfile
        if ( !fs.existsSync( dockerRoot + "/Dockerfile" ) ) this._throwError( `"Dockerfile" not found.`, dockerRoot );

        const tags = new Set( [tag] );

        // apply autobuild tags
        if ( dockerConfig["x-build"].autobuild_tags ) {
            if ( !Array.isArray( dockerConfig["x-build"].autobuild_tags ) ) dockerConfig["x-build"].autobuild_tags = [dockerConfig["x-build"].autobuild_tags];

            for ( const tag of dockerConfig["x-build"].autobuild_tags ) {
                if ( id.branch === tag || id.tags.includes( tag ) ) tags.add( tag );
            }
        }

        // no tags to build found
        if ( !tags.size ) this._throwError( "No tags to build found. Terminated.", dockerRoot );

        const services = [];

        for ( const service of Object.values( dockerConfig.services ) ) {
            if ( !service.build || !service.image ) continue;

            const build = {
                "images": new Set(),
                "params": service.build,
            };

            services.push( build );

            const image = service.image.replace( /:.*/, "" );

            for ( const tag of tags ) {
                const _image = image + ":" + tag;

                build.images.add( _image );

                console.log( `Image: ${_image}` );
            }
        }

        // confirm build
        if ( !process.cli.options.force && ( await confirm( "\nContinue build process?", ["n", "y"] ) ) === "n" ) this._throwError( "Terminated.", dockerRoot );

        // build images
        for ( const service of services ) {
            try {
                let context = dockerRoot;
                if ( service.params.context ) context += "/" + service.params.context;

                const args = [];

                if ( service.params.dockerfile ) args.push( "--file", service.params.dockerfile );

                if ( service.params.shm_size ) args.push( "--shm-size", service.params.shm_size );

                if ( service.params.network ) args.push( "--network", service.params.network );

                if ( service.params.target ) args.push( "--target", service.params.target );

                if ( service.params.labels ) {
                    if ( Array.isArray( service.params.labels ) ) {
                        for ( const label of service.params.labels ) {
                            args.push( "--label", label );
                        }
                    }
                    else {
                        for ( const label in service.params.labels ) {
                            args.push( "--label", label + "=" + service.params.labels[label] );
                        }
                    }
                }

                if ( service.params.cache_from ) service.params.cache_from.forEach( image => args.push( "--cache-from", image ) );

                if ( service.params.args ) {
                    if ( Array.isArray( service.params.args ) ) {
                        for ( const arg of service.params.args ) {
                            args.push( "--build-arg", arg );
                        }
                    }
                    else {
                        for ( const arg in service.params.args ) {
                            args.push( "--build-arg", arg + "=" + service.params.args[arg] );
                        }
                    }
                }

                child_process.execFileSync( "docker",
                    [

                        //
                        "builder",
                        "build",
                        "--rm", // remove intermediate containers after a successful build (default true)
                        "--force-rm", // always remove intermediate containers
                        "--no-cache", // do not use cache when building the image
                        "--pull", // always attempt to pull a newer version of the image
                        ...[...service.images].map( image => "--tag=" + image ),
                        ...args,
                        context,
                    ],
                    { "stdio": "inherit" } );
            }
            catch ( e ) {
                console.log( e );

                this._throwError( "Terminated.", dockerRoot );
            }
        }

        // remove temp dir
        if ( dockerRoot.remove ) dockerRoot.remove();

        // push images
        if ( process.cli.options.push ) {
            for ( const service of services ) {
                for ( const image of service.images ) {
                    while ( 1 ) {
                        try {
                            console.log( `\nPushing: ${image}` );

                            child_process.execFileSync( "docker", ["image", "push", image], { "stdio": "inherit" } );

                            break;
                        }
                        catch ( e ) {
                            if ( ( await confirm( "\nUnable to push image. Repeat?", ["n", "y"] ) ) === "n" ) break;
                        }
                    }
                }
            }
        }

        // remove images
        if ( process.cli.options.remove ) {
            const images = [];

            for ( const service of services ) images.push( ...service.images );

            try {
                console.log( `\nRemoving images` );

                child_process.execFileSync( "docker", ["image", "rm", ...images], { "stdio": "inherit" } );
            }
            catch ( e ) {}
        }
    }

    _throwError ( msg, dockerRoot ) {

        // remove temp dir
        if ( dockerRoot && dockerRoot.remove ) dockerRoot.remove();

        super._throwError( msg );
    }
}
