import Command from "#lib/command";
import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import { confirm } from "#core/utils";
import { TmpDir } from "#core/tmp";
import { readConfig } from "#core/config";
import Ajv from "#core/ajv";

// NOTE https://docs.docker.com/compose/compose-file/build/

const validate = new Ajv().compile( readConfig( "#core/resources/schemas/docker-compose.schema.yaml", { "resolve": import.meta.url } ) );

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
                "arg": {
                    "short": "a",
                    "description": "docker build arg",
                    "schema": {
                        "type": "array",
                        "item": { "type": "string" },
                    },
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

        if ( !rootPackage ) this._throwError( "Unable to find root package" );

        var dockerRoot = rootPackage.root;

        // read docker-compose.yaml
        if ( !fs.existsSync( rootPackage.root + "/docker-compose.yaml" ) ) this._throwError( `"docker-compose.yaml" not found` );
        const dockerConfig = readConfig( rootPackage.root + "/docker-compose.yaml" );

        // validate docker-compose.yaml
        process.stdout.write( `Validating docker-compose.yaml ... ` );
        if ( !validate( dockerConfig ) ) this._throwError( `not valid, errors:\n${validate.errors}` );
        console.log( `OK` );

        var git = rootPackage.git;

        var status = await git.getId();
        if ( !status.ok ) this._throwError( status, dockerRoot );
        if ( !status.data.hash ) this._throwError( `Unable to identify current changeset`, dockerRoot );
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

            status = await git.getId();
            if ( !status.ok ) this._throwError( status, dockerRoot );
            status = status.data;
        }

        const tags = new Set( [tag] );

        // apply autobuild tags
        if ( dockerConfig["x-build"].auto_tags ) {
            if ( !Array.isArray( dockerConfig["x-build"].auto_tags ) ) dockerConfig["x-build"].auto_tags = [dockerConfig["x-build"].auto_tags];

            for ( const tag of dockerConfig["x-build"].auto_tags ) {
                if ( status.branch === tag || status.tags.includes( tag ) ) tags.add( tag );
            }
        }

        // no tags to build found
        if ( !tags.size ) this._throwError( "No tags to build found", dockerRoot );

        const services = [],
            imageIndex = new Set();

        for ( const [name, service] of Object.entries( dockerConfig.services ) ) {

            // do not build service
            if ( !service.build || !service.image ) continue;

            if ( typeof service.build === "string" ) {
                service.build = {
                    "context": service.build,
                };
            }

            // XXX check build.context, do not build if context is not a relative patj (can be git url)

            // remove tag
            const image = service.image.replace( /:.*/, "" );

            if ( imageIndex.has( image ) ) continue;
            imageIndex.add( image );

            const build = {
                name,
                image,
                "dependencies": service.depends_on || [],
                "images": new Set(),
                "params": service.build,
            };

            services.push( build );

            for ( const tag of tags ) {
                const _image = image + ":" + tag;

                build.images.add( _image );

                console.log( `Image: ${_image}` );
            }
        }

        // XXX sort services

        // confirm build
        if ( !process.cli.options.force && ( await confirm( "\nContinue build process?", ["n", "y"] ) ) === "n" ) this._throwError( "Terminated", dockerRoot );

        // build images
        for ( const service of services ) {
            let context = dockerRoot;

            if ( service.params.context ) context = path.posix.join( context, service.params.context );

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
                            name = label.substring( 0, idx );
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
            labels["git.tags"] = status.tags.sort().join( "," );
            labels["git.date"] = status.date;
            labels["git.hash"] = status.hash;

            const upstream = await git.getUpstream();
            if ( upstream?.isGithub ) {
                labels["org.opencontainers.image.source"] = upstream.homeUrl;
                labels["org.opencontainers.image.description"] = `branch: ${labels["git.branch"]}, tags: [${labels["git.tags"]}], date: ${labels["git.date"]}, hash: ${labels["git.hash"]}`;
            }

            for ( const label in labels ) {
                args.push( "--label", label + "=" + labels[label] );
            }

            if ( service.params.cache_from ) service.params.cache_from.forEach( image => args.push( "--cache-from", image ) );

            // compose build args
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

            args.push( "--build-arg", `GIT_ID=${JSON.stringify( status )}` );

            if ( process.cli.options.arg ) {
                for ( const arg of process.cli.options.arg ) {
                    args.push( "--build-arg", arg );
                }
            }

            console.log( `\nBuilding image: ${service.image} ...` );

            const res = childProcess.spawnSync(
                "docker",
                [

                    //
                    "builder",
                    "build",
                    "--rm", // remove intermediate containers after a successful build (default true)
                    "--force-rm", // always remove intermediate containers
                    "--no-cache", // do not use cache when building the image
                    "--pull", // always attempt to pull a newer version of the image
                    ...args,
                    ...[...service.images].map( image => "--tag=" + image ),
                    context,
                ],
                { "stdio": "inherit" }
            );

            if ( res.status ) this._throwError( "Terminated", dockerRoot );

            // push images
            if ( process.cli.options.push ) {
                for ( const image of service.images ) {
                    while ( true ) {
                        console.log( `\nPushing: ${image}` );

                        const res = childProcess.spawnSync( "docker", ["image", "push", image], { "stdio": "inherit" } );

                        if ( !res.status ) break;

                        if ( ( await confirm( "\nUnable to push image. Repeat?", ["y", "n"] ) ) === "n" ) break;
                    }
                }
            }
        }

        // remove temp dir
        if ( dockerRoot instanceof TmpDir ) dockerRoot.destroy();

        // remove images
        if ( process.cli.options.remove ) {
            const images = [];

            for ( const service of services ) images.push( ...service.images );

            console.log( `\nRemoving images` );

            childProcess.spawnSync( "docker", ["image", "rm", ...images], { "stdio": "inherit" } );
        }
    }

    _throwError ( msg, dockerRoot ) {

        // remove temp dir
        if ( dockerRoot instanceof TmpDir ) dockerRoot.destroy();

        super._throwError( msg );
    }
}
