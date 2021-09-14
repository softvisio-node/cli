import Command from "#lib/command";
import fs from "fs";
import child_process from "child_process";
import { confirm } from "#core/utils";
import { TmpDir } from "#core/tmp";
import * as config from "#core/config";

export default class extends Command {
    static cli () {
        return {
            "options": {
                "remove": {
                    "description": "remove images after build and push",
                    "default": false,
                    "schema": { "type": "boolean" },
                },
                "push": {
                    "description": "do not push images",
                    "default": true,
                    "schema": { "type": "boolean" },
                },
                "force": {
                    "description": `answer "YES" on all questions`,
                    "default": false,
                    "schema": { "type": "boolean" },
                },
            },
            "arguments": {
                "tag": {
                    "description": "git branch, tag or hash. If not specified current branch name will be used",
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
        const rootPackage = this._findRootPackage();

        if ( !rootPackage ) this._throwError( "Unable to find project root." );

        var dockerRoot = rootPackage.root;

        // read docker-stack.yaml
        if ( !fs.existsSync( rootPackage.root + "/docker-stack.yaml" ) ) this._throwError( `"docker-stack.yaml" not found.` );
        const dockerConfig = config.read( rootPackage.root + "/docker-stack.yaml" );

        var git = rootPackage.git;

        var status = await git.getStatus();
        if ( !status.ok ) this._throwError( status, dockerRoot );
        if ( !status.data.hash ) this._throwError( `Unable to identify current changeset.`, dockerRoot );
        status = status.data;

        // define tag to clone
        const tag = process.cli.arguments.tag || dockerConfig["x-build"].default_tag || status.branch;

        const clone = status.isDirty || !( status.branch === tag || status.hash.startsWith( tag ) || status.tags.includes( tag ) );

        // clone git repo
        if ( clone ) {
            dockerRoot = new TmpDir();

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

            status = await git.getStatus();
            if ( !status.ok ) this._throwError( status, dockerRoot );
            status = status.data;
        }

        // check Dockerfile
        if ( !fs.existsSync( dockerRoot + "/Dockerfile" ) ) this._throwError( `"Dockerfile" not found.`, dockerRoot );

        const tags = new Set( [tag] );

        // apply autobuild tags
        if ( dockerConfig["x-build"].auto_tags ) {
            if ( !Array.isArray( dockerConfig["x-build"].auto_tags ) ) dockerConfig["x-build"].auto_tags = [dockerConfig["x-build"].auto_tags];

            for ( const tag of dockerConfig["x-build"].auto_tags ) {
                if ( status.branch === tag || status.tags.includes( tag ) ) tags.add( tag );
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

                // compose labels
                let labels = {};

                if ( service.params.labels ) {
                    if ( Array.isArray( service.params?.labels ) ) {
                        for ( const label of service.params.labels ) {
                            let name, value;

                            const idx = label.indexOf( "=" );

                            if ( idx === -1 ) {
                                name = label;
                                value = "";
                            }
                            else if ( idx === 0 ) {
                                continue;
                            }
                            else {
                                name = label.substr( 0, idx );
                                value = label.substring( idx + 1 );
                            }

                            labels[name] = value;
                        }
                    }
                    else if ( typeof service.params?.labels === "object" ) {
                        labels = { ...service.params.labels };
                    }
                }

                labels["git.branch"] = status.branch || "";
                labels["git.hash"] = status.hash;
                labels["git.date"] = status.date;
                labels["git.tags"] = status.tags.sort().join( "," );

                for ( const label in labels ) {
                    args.push( "--label", label + "=" + labels[label] );
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
        if ( dockerRoot instanceof TmpDir ) dockerRoot.destroy();

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
        if ( dockerRoot instanceof TmpDir ) dockerRoot.destroy();

        super._throwError( msg );
    }
}
