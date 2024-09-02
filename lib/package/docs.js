import fs from "node:fs";
import url from "node:url";
import Options from "./docs/options.js";
import glob from "#core/glob";
import ansi from "#core/text/ansi";
import GitHub from "#core/api/github";
import env from "#core/env";
import File from "#core/file";
import FileTree from "#core/file-tree";
import * as utils from "#core/utils";
import { resolve } from "#core/utils";
import ejs from "#core/ejs";
import LintFile from "#lib/lint/file";

export default class Docs {
    #rootPackage;

    constructor ( rootPackage ) {
        this.#rootPackage = rootPackage;
    }

    // properties
    get rootPackage () {
        return this.#rootPackage;
    }

    get location () {
        return this.#rootPackage.cliConfig.docs?.location;
    }

    get locationPath () {
        if ( !this.location ) {
            return null;
        }
        else if ( this.location === "/" ) {
            return this.#rootPackage.root;
        }
        else {
            return this.#rootPackage.root + this.location;
        }
    }

    get isExists () {
        return !!( this.locationPath && fs.existsSync( this.locationPath ) );
    }

    // public
    async init () {
        process.stdout.write( `Initializing documentation ... ` );

        var res;

        const options = new Options( this.#rootPackage, this.#rootPackage.cliConfig.docs );

        try {
            await this.#init( options );

            res = result( 200 );
        }
        catch ( e ) {
            res = result.catch( e );
        }

        console.log( res + "" );

        await this.#initGitHubPages( options );

        return res;
    }

    async build () {
        process.stdout.write( `Building documentation ... ` );

        var res, warn;

        try {

            // check docs config
            if ( !this.isExists ) throw result( [ 404, `Documentation config wasn't found.` ] );

            const options = new Options( this.#rootPackage, this.#rootPackage.cliConfig.docs );

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
    async #init ( options ) {
        const fileTree = new FileTree();

        // generate README.md
        if ( !fs.existsSync( this.locationPath + "/README.md" ) ) {
            const readmeTmpl = utils.resolve( "#resources/templates/docs/README-default.md", import.meta.url );

            if ( this.location !== "/" ) {

                // default readme
                fileTree.add( { "path": "README.md", "buffer": await ejs.renderFile( readmeTmpl, options ) } );
            }
            else {

                // copy root readme
                if ( fs.existsSync( this.#rootPackage.root + "/README.md" ) ) {
                    fileTree.add( { "path": "README.md", "buffer": fs.readFileSync( this.#rootPackage.root + "/README.md" ) } );
                }

                // default readme
                else {
                    fileTree.add( { "path": "README.md", "buffer": await ejs.renderFile( readmeTmpl, options ) } );
                }
            }
        }

        // generate default sidebar
        if ( !fs.existsSync( this.locationPath + "/_sidebar.md" ) ) {
            fileTree.add( { "path": "_sidebar.md", "buffer": await ejs.renderFile( utils.resolve( "#resources/templates/docs/_sidebar.md", import.meta.url ), options ) } );
        }

        await fileTree.write( this.locationPath );

        // copy .nojekyll
        this.#createNoJekyll( options );
    }

    async #buildDefault ( options ) {

        // generate index.html
        let index = await ejs.renderFile( utils.resolve( "#resources/templates/docs/index.html", import.meta.url ), options );

        // lint index.html
        const res = await new LintFile( new File( { "path": this.locationPath + "/" + "index.html", "buffer": index } ) ).run( "lint" );
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
        const componentsUrl = resolve( "@softvisio/core/app/components", url.pathToFileURL( this.#rootPackage.root ), { "url": true } ),
            Components = ( await import( componentsUrl ) ).default,
            components = new Components( url.pathToFileURL( this.#rootPackage.root + "/lib/app.js" ) );

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

            if ( fileTree.isEmapty ) continue;

            // write files
            await fileTree.write( location );

            // lint
            if ( lint ) {
                for ( const file of fileTree ) {
                    const lintFile = new LintFile( new File( { "path": location + "/" + file.path } ), { "write": true } );

                    const res = await lintFile.run( "lint" );
                    if ( !res.ok ) throw res;
                }
            }
        }
    }

    // XXX replace relative urls
    async #buildReadme ( options ) {
        const readmePath = this.locationPath + "/README.md";

        if ( this.location === "/" || options.generateReadme === false || !fs.existsSync( readmePath ) ) return;

        const template = utils.resolve( "#resources/templates/docs/README-wrapper.md.ejs", import.meta.url ),
            fileTree = new FileTree();

        options.readmeContent = fs.readFileSync( readmePath, "utf8" ).trim();

        // XXX replace relative urls

        fileTree.add( { "path": "README.md", "buffer": await ejs.renderFile( template, options ) } );

        await fileTree.write( this.#rootPackage.root );
    }

    #createNoJekyll ( options ) {
        fs.writeFileSync( this.locationPath + "/.nojekyll", "" );
    }

    async #checkMarkdown ( options, { lint } = {} ) {
        const files = glob( "**/*.md", {
            "cwd": this.locationPath,
            "directories": false,
        } );

        const warn = [];

        for ( const file of files ) {
            let markdown = fs.readFileSync( this.locationPath + "/" + file, "utf8" );

            let changed;

            // check code blocks language
            markdown = markdown.replaceAll( /(````*)(\w*?)(\n.*?\1)/gms, ( match, tag, language, body ) => {
                if ( language ) {
                    const languageAlias = options.addLanguage( language );

                    if ( language !== languageAlias ) {
                        changed = true;

                        return tag + languageAlias + body;
                    }
                    else {
                        return match;
                    }
                }
                else {
                    throw result( [ 500, `Code block in file "${ file }" has no language identifier:\n${ match }` ] );
                }
            } );

            // check types
            {
                const blocks = markdown.split( /(````*)(.+?\1)/s ),
                    types = await options.getTypes();

                for ( let n = 0; n < blocks.length; n++ ) {

                    // code block start
                    if ( blocks[ n ].startsWith( "```" ) ) continue;

                    // code block body
                    if ( n && blocks[ n - 1 ].startsWith( "```" ) ) continue;

                    for ( const match of blocks[ n ].matchAll( /<([\w.]+)(\[\])?\\>/g ) ) {
                        const type = match[ 1 ];

                        if ( type in types ) {
                            await options.addType( type );
                        }
                        else {
                            warn.push( `${ ansi.warn( ` warn ` ) } Type "${ type }" in file "${ file }" is undefined` );
                        }
                    }
                }
            }

            if ( changed ) fs.writeFileSync( this.locationPath + "/" + file, markdown );
        }

        // lint
        if ( lint ) {
            for ( const file of files ) {
                const lintFile = new LintFile(
                    new File( {
                        "path": this.locationPath + "/" + file,
                    } ),
                    { "write": true }
                );

                const res = await lintFile.run( "lint" );
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
            const upstream = this.#rootPackage.git.upstream;

            env.loadUserEnv();

            if ( upstream.hosting !== "github" ) throw result( [ 500, `Upstream is not GitHub` ] );

            if ( !process.env.GITHUB_TOKEN ) throw result( [ 500, `GitHub API token is not configured` ] );

            const github = new GitHub( process.env.GITHUB_TOKEN );

            res = await github.getPages( upstream.repoId );

            // pages created
            if ( res.ok ) {
                if ( path === res.data.source.path ) {
                    throw result( [ 200, `OK, branch: "${ res.data.source.branch }", path: "${ res.data.source.path }"` ] );
                }

                // update location
                else {
                    res = await github.updatePages( upstream.repoId, { "source": { branch, path } } );

                    if ( res.ok ) throw result( [ 200, `Updated, branch: "${ branch }", path: "${ path }"` ] );
                }
            }

            // create pages
            else {
                res = await github.createPages( upstream.repoId, branch, path );
            }
        }
        catch ( e ) {
            res = result.catch( e );
        }

        console.log( res + "" );
    }
}
