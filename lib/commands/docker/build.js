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

        // read .docker.yaml
        if ( !fs.existsSync( rootPackage.root + "/.docker.yaml" ) ) this._throwError( `".docker.yaml" not found.` );
        const dockerConfig = fs.config.read( rootPackage.root + "/.docker.yaml" );
        if ( !dockerConfig.registry ) this._throwError( `Required data is missed in ".docker.yaml".` );

        var git = rootPackage.git;

        var id = await git.getId();
        if ( !id.ok ) this._throwError( id, dockerRoot );
        if ( !id.data.hash ) this._throwError( `Unable to identify current changeset.`, dockerRoot );

        let tag = process.cli.arguments.tag || dockerConfig.default_tag || id.data.branch;

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
        if ( dockerConfig.tags_mapping && dockerConfig.tags_mapping[tag] ) tag = dockerConfig.tags_mapping[tag];

        const tags = { [tag]: true };

        // apply auto tags
        if ( dockerConfig.auto_tags ) {
            if ( !Array.isArray( dockerConfig.auto_tags ) ) dockerConfig.auto_tags = [dockerConfig.auto_tags];

            const possibleTags = {};
            if ( id.data.branch ) possibleTags[id.data.branch] = true;
            id.data.tags.forEach( tag => ( possibleTags[tag] = true ) );

            for ( const tag of dockerConfig.auto_tags ) {
                if ( possibleTags[tag] ) tags[tag] = true;
            }
        }

        const images = [];

        for ( const registry of Array.isArray( dockerConfig.registry ) ? dockerConfig.registry : [dockerConfig.registry] ) {
            for ( const tag in tags ) {
                images.push( `${registry}:${tag}` );

                console.log( `IMAGE: ${registry}:${tag}` );
            }
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
