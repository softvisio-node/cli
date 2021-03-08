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
            { confirm } = require( "@softvisio/core/utils" );

        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( "Unable to find project root." );

        var dockerRoot = rootPackage.root;

        // read docker-compose.yaml
        if ( !fs.existsSync( rootPackage.root + "/docker-compose.yaml" ) ) this._throwError( `"docker-compose.yaml" not found.` );
        const dockerConfig = fs.config.read( rootPackage.root + "/docker-compose.yaml" );

        var git = rootPackage.git;

        var id = await git.getId();
        if ( !id.ok ) this._throwError( id, dockerRoot );
        if ( !id.data.hash ) this._throwError( `Unable to identify current changeset.`, dockerRoot );

        let tag = process.cli.arguments.tag || dockerConfig["x-build"].default_tag || id.data.branch;

        const clone = !id.data.isDirty && ( id.data.branch === tag || id.data.hash.indexOf( tag ) === 0 || Object.fromEntries( id.data.tags.map( tag => [tag, true] ) )[tag] ) ? false : true;

        // clone git repo
        if ( clone ) {
            dockerRoot = fs.tmp.dir();

            process.stdout.write( `Cloning ... ` );
            let res = await git.run( "clone", "--quiet", rootPackage.root, dockerRoot );
            if ( !res.ok ) this._throwError( res );
            console.log( res + "" );

            const Git = require( "../../git" );
            git = new Git( dockerRoot );

            process.stdout.write( `Checking out "${tag}" ... ` );
            res = await git.run( "checkout", tag );
            if ( !res.ok ) this._throwError( res );
            console.log( res + "\n" );

            id = await git.getId();
            if ( !id.ok ) this._throwError( id, dockerRoot );
        }

        // check Dockerfile
        if ( !fs.existsSync( dockerRoot + "/Dockerfile" ) ) this._throwError( `"Dockerfile" not found.`, dockerRoot );

        // apply tags mapping
        if ( dockerConfig["x-build"].tags_mapping && dockerConfig["x-build"].tags_mapping[tag] ) tag = dockerConfig["x-build"].tags_mapping[tag];

        const tags = { [tag]: true };

        // apply auto tags
        if ( dockerConfig["x-build"].auto_tags ) {
            if ( !Array.isArray( dockerConfig["x-build"].auto_tags ) ) dockerConfig["x-build"].auto_tags = [dockerConfig["x-build"].auto_tags];

            const possibleTags = {};
            if ( id.data.branch ) possibleTags[id.data.branch] = true;
            id.data.tags.forEach( tag => ( possibleTags[tag] = true ) );

            for ( const tag of dockerConfig["x-build"].auto_tags ) {
                if ( possibleTags[tag] ) tags[tag] = true;
            }
        }

        const services = [];

        for ( const service of Object.values( dockerConfig.services ) ) {
            if ( !service.build || !service.image ) continue;

            const build = {
                "images": new Set(),
                "params": service.build,
            };

            services.push( build );

            for ( const tag in tags ) {
                let additionalImages = [];

                if ( service.build.labels?.["x-additional-image"] ) {
                    additionalImages = [service.build.labels["x-additional-image"]];

                    delete service.build.labels["x-additional-image"];
                }

                for ( const image of [service.image.replace( /:.*/, "" ), ...additionalImages] ) {
                    const _image = image + ":" + tag;

                    build.images.add( _image );

                    console.log( `Image: ${_image}` );
                }
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

                if ( service.params.labels ) service.params.labels.forEach( label => args.push( "--label", label ) );

                if ( service.params.cache_from ) service.params.cache_from.forEach( image => args.push( "--cache-from", image ) );

                if ( service.params.args ) {
                    ( Array.isArray( service.params.args ) ? service.params.args : Object.keys( service.params.args ).map( key => key + "=" + service.params.args[key] ) ).forEach( arg => args.push( "--build-arg", arg ) );
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
                this._throwError( "Terminated.", dockerRoot );
            }
        }

        // remove temp dir
        if ( dockerRoot.unlinkSync ) dockerRoot.unlinkSync();

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
        if ( dockerRoot && dockerRoot.unlinkSync ) dockerRoot.unlinkSync();

        super._throwError( msg );
    }
};
