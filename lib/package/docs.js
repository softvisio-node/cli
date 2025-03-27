import fs from "node:fs";
import url from "node:url";
import GitHub from "#core/api/github";
import ejs from "#core/ejs";
import env from "#core/env";
import File from "#core/file";
import FileTree from "#core/file-tree";
import { exists } from "#core/fs";
import { glob } from "#core/glob";
import ansi from "#core/text/ansi";
import * as utils from "#core/utils";
import { resolve } from "#core/utils";
import { lintFile } from "#lib/lint";
import Markdown from "#lib/markdown";
import Options from "./docs/options.js";

export default class Docs {
    #package;

    constructor ( pkg ) {
        this.#package = pkg;
    }

    // properties
    get package () {
        return this.#package;
    }

    get location () {
        return this.#package.cliConfig.docs?.location;
    }

    get locationPath () {
        if ( !this.location ) {
            return null;
        }
        else if ( this.location === "/" ) {
            return this.#package.root;
        }
        else {
            return this.#package.root + this.location;
        }
    }

    get isEnabled () {
        return Boolean( this.location );
    }

    get isInitialized () {
        return Boolean( this.isEnabled && fs.existsSync( this.locationPath ) );
    }

    // public
    async init () {
        var res;

        process.stdout.write( `Initializing documentation ... ` );

        try {

            // check docs config
            if ( !this.location ) throw result( [ 404, `Documentation config was not found` ] );

            const options = await new Options( this.#package ).init();

            await this.#init( options );

            await this.#initGitHubPages( options );

            res = result( 200 );
        }
        catch ( e ) {
            res = result.catch( e );
        }

        console.log( res + "" );

        return res;
    }

    async build () {
        var res, warn;

        // preserve symlinks
        res = await this.#preserveSymlinks();
        if ( res ) return res;

        process.stdout.write( `Building documentation ... ` );

        try {

            // check docs config
            if ( !this.location ) throw result( [ 404, `Documentation config was not found` ] );

            // check docs initialized
            if ( !this.isInitialized ) throw result( [ 404, `Documentation is not initialized` ] );

            const options = await new Options( this.#package ).init();

            // build API schemas
            await this.#buildAppSchemas( options, { "lint": false } );

            // check markdown files
            warn = await this.#checkMarkdown( options, { "lint": true } );

            // build index.html
            await this.#buildDefault( options );

            // build README.md
            await this.#buildReadme( options );

            res = result( 200 );
        }
        catch ( e ) {
            res = result.catch( e, { "log": false } );
        }

        console.log( res + "" );
        if ( warn ) console.log( warn );

        return res;
    }

    // private
    async #preserveSymlinks ( { preserveSymlinksMain = true } = {} ) {
        const execArgv = new Set( process.execArgv ),
            preserveSymlinks = !execArgv.has( "--preserve-symlinks" ) && !process.env.NODE_PRESERVE_SYMLINKS;

        if ( preserveSymlinksMain ) {
            preserveSymlinksMain = !execArgv.has( "--preserve-symlinks-main" ) && !process.env.NODE_PRESERVE_SYMLINKS_MAIN;
        }

        if ( preserveSymlinks || preserveSymlinksMain ) {
            const { "default": childProcess } = await import( "node:child_process" ),
                { dirname, resolve } = await import( "node:path" ),
                { readlinkSync } = await import( "node:fs" );

            let scriptPath;

            try {
                scriptPath = resolve( dirname( process.argv[ 1 ] ), readlinkSync( process.argv[ 1 ] ) );
            }
            catch {
                scriptPath = process.argv[ 1 ];
            }

            const res = childProcess.spawnSync(
                process.argv[ 0 ],
                [

                    //
                    "--preserve-symlinks",
                    "--preserve-symlinks-main",
                    scriptPath,
                    "docs",
                    "build",
                ],
                {
                    "cwd": this.#package.root,
                    "stdio": "inherit",
                }
            );

            return result( res.status
                ? 500
                : 200 );
        }
    }

    async #init ( options ) {
        const fileTree = new FileTree();

        // generate README.md
        if ( !( await exists( this.locationPath + "/README.md" ) ) ) {
            const readmeTmpl = utils.resolve( "#resources/templates/docs/README-default.md", import.meta.url );

            if ( this.location !== "/" ) {

                // default readme
                fileTree.add( {
                    "path": "README.md",
                    "buffer": await ejs.renderFile( readmeTmpl, options ),
                } );
            }
            else {

                // copy root readme
                if ( await exists( this.#package.root + "/README.md" ) ) {
                    fileTree.add( {
                        "path": "README.md",
                        "buffer": fs.readFileSync( this.#package.root + "/README.md" ),
                    } );
                }

                // default readme
                else {
                    fileTree.add( {
                        "path": "README.md",
                        "buffer": await ejs.renderFile( readmeTmpl, options ),
                    } );
                }
            }
        }

        // generate default sidebar
        if ( !( await exists( this.locationPath + "/_sidebar.md" ) ) ) {
            fileTree.add( {
                "path": "_sidebar.md",
                "buffer": await ejs.renderFile( utils.resolve( "#resources/templates/docs/_sidebar.md", import.meta.url ), options ),
            } );
        }

        await fileTree.write( this.locationPath );

        // copy .nojekyll
        this.#createNoJekyll( options );
    }

    async #buildDefault ( options ) {

        // generate index.html
        let index = await ejs.renderFile( utils.resolve( "#resources/templates/docs/index.html", import.meta.url ), options );

        // lint index.html
        const res = await lintFile( new File( {
            "path": this.locationPath + "/" + "index.html",
            "buffer": index,
        } ) );
        if ( !res.ok ) throw res;

        index = res.data;

        // write index.html
        fs.writeFileSync( this.locationPath + "/" + "index.html", index );

        // create .nojekyll
        this.#createNoJekyll( options );
    }

    async #buildAppSchemas ( options, { lint } = {} ) {
        if ( !options.app ) return;

        // create app components
        const componentsUrl = resolve( "@softvisio/core/app/components", url.pathToFileURL( this.#package.root + "/lib/app.js" ), { "url": true } ),
            { "default": Components } = await import( componentsUrl ),
            components = new Components( url.pathToFileURL( this.#package.root + "/lib/app.js" ) );

        // load app components
        const res = components.load();
        if ( !res.ok ) throw res;

        for ( const type of [ "api", "rpc" ] ) {
            if ( !options.app[ type ] ) continue;

            let res;

            // get schema
            res = components.getSchema( type );
            if ( !res.ok ) throw res;
            const schema = res.data;

            res = await schema.generate( options.app[ type ] );
            if ( !res.ok ) throw res;
            const fileTree = res.data;

            const location = this.locationPath + "/" + type;

            fs.rmSync( location, { "force": true, "recursive": true } );

            if ( fileTree.isEmpty ) continue;

            // write files
            await fileTree.write( location );

            // lint
            if ( lint ) {
                for ( const file of fileTree ) {
                    const res = await lintFile(
                        new File( {
                            "path": location + "/" + file.path,
                        } ),
                        {
                            "write": true,
                        }
                    );
                    if ( !res.ok ) throw res;
                }
            }
        }
    }

    // TODO: replace relative urls
    async #buildReadme ( options ) {
        const readmePath = this.locationPath + "/README.md";

        if ( this.location === "/" || options.generateReadme === false || !( await exists( readmePath ) ) ) return;

        const template = utils.resolve( "#resources/templates/docs/README-wrapper.md.ejs", import.meta.url ),
            fileTree = new FileTree();

        options.readmeContent = fs.readFileSync( readmePath, "utf8" ).trim();

        // TODO: replace relative urls

        fileTree.add( {
            "path": "README.md",
            "buffer": await ejs.renderFile( template, options ),
        } );

        await fileTree.write( this.#package.root );
    }

    #createNoJekyll ( options ) {
        fs.writeFileSync( this.locationPath + "/.nojekyll", "" );
    }

    async #checkMarkdown ( options, { lint } = {} ) {
        const files = await glob( "**/*.md", {
                "cwd": this.locationPath,
                "directories": false,
            } ),
            types = options.getTypes(),
            warn = [];

        for ( const file of files ) {
            const source = fs.readFileSync( this.locationPath + "/" + file, "utf8" );

            const markdown = new Markdown( source );

            const content = markdown
                .traverse(
                    ( node, index, parent ) => {
                        if ( node.lang ) {
                            const language = markdown.getCodeLanguage( node.lang )?.language || node.lang;

                            if ( !options.addLanguage( language ) ) {
                                throw result( [ 500, `Code block in file "${ file }" has unsupported code language identifier "${ language }"` ] );
                            }

                            node.lang = language;
                        }

                        return markdown.CONTINUE;
                    },
                    {
                        "test": "code",
                    }
                )
                .toMarkdown( {
                    "handlers": {
                        text ( node, parent, state, info ) {
                            const value = markdown.nodeToString( node );

                            for ( const match of value.matchAll( /{([\w.[\]|]+)}/g ) ) {
                                for ( let type of match[ 1 ].split( "|" ) ) {
                                    type = type.replace( /\[]$/, "" );

                                    if ( type in types ) {
                                        options.addType( type );
                                    }
                                    else {
                                        warn.push( `${ ansi.warn( ` warn ` ) } Type "${ type }" in file "${ file }" is undefined` );
                                    }
                                }
                            }

                            return markdown.defaultHandlers.text( node, parent, state, info );
                        },
                    },
                } );

            if ( content !== markdown.source ) fs.writeFileSync( this.locationPath + "/" + file, content );
        }

        // lint
        if ( lint ) {
            for ( const file of files ) {
                const res = await lintFile(
                    new File( {
                        "path": this.locationPath + "/" + file,
                    } ),
                    {
                        "write": true,
                    }
                );
                if ( !res.ok ) return res;
            }
        }

        return warn.join( "\n" );
    }

    async #initGitHubPages ( options ) {
        const branch = "main",
            path = this.location;

        process.stdout.write( `Initializing GitHub pages ... ` );

        var res;

        try {

            // GitHub pages init
            const upstream = this.#package.git.upstream;

            env.loadUserEnv();

            if ( upstream.hosting !== "github" ) throw result( [ 500, `Upstream is not GitHub` ] );

            if ( !process.env.GITHUB_TOKEN ) throw result( [ 500, `GitHub API token is not configured` ] );

            const github = new GitHub( process.env.GITHUB_TOKEN );

            res = await github.getPages( upstream.repositorySlug );

            // pages created
            if ( res.ok ) {
                if ( path === res.data.source.path ) {
                    throw result( [ 200, `OK, branch: "${ res.data.source.branch }", path: "${ res.data.source.path }"` ] );
                }

                // update location
                else {
                    res = await github.updatePages( upstream.repositorySlug, { "source": { branch, path } } );

                    if ( res.ok ) throw result( [ 200, `Updated, branch: "${ branch }", path: "${ path }"` ] );
                }
            }

            // create pages
            else {
                res = await github.createPages( upstream.repositorySlug, branch, path );
            }
        }
        catch ( e ) {
            res = result.catch( e );
        }

        console.log( res + "" );
    }
}
