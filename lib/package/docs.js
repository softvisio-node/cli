import fs from "#core/fs";
import url from "url";
import Options from "./docs/options.js";
import glob from "glob";
import ansi from "#core/text/ansi";
import GitHub from "#core/api/github";
import env from "#core/env";

export default class Docs {
    #rootPackage;

    constructor ( rootPackage ) {
        this.#rootPackage = rootPackage;
    }

    get rootPackage () {
        return this.#rootPackage;
    }

    get isExists () {
        return !!this.#rootPackage.docsConfig;
    }

    // public
    async init () {
        process.stdout.write( `Initializing documentation ... ` );

        var res;

        const options = await Options.new( this.#rootPackage, this.#rootPackage.docsConfig || { "location": "docs" } );

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
            if ( !this.isExists ) throw result( [404, `Documentation config wasn't found.`] );

            const options = await Options.new( this.#rootPackage, this.#rootPackage.docsConfig );

            // build API schemas
            await this.#buildAPISchemas( options, "api" );
            await this.#buildAPISchemas( options, "rpc" );

            // check markdown files
            warn = await this.#checkMarkdown( options );

            // build index.html
            await this.#buildDefault( options );

            // build main README.md
            await this.#buildReadme( options );

            res = result( 200 );
        }
        catch ( e ) {
            res = result.catch( e );
        }

        console.log( res + "" );
        if ( warn ) console.log( warn );

        return res;
    }

    // private
    async #init ( options ) {
        const { "default": ejs } = await import( "ejs" ),
            fileTree = new fs.FileTree();

        // generate README.md
        if ( !fs.existsSync( options.locationPath + "/README.md" ) ) {
            const readmeTmpl = fs.resolve( "#resources/templates/docs/README.md", import.meta.url );

            if ( options.location === "root" ) {

                // default readme
                fileTree.add( { "path": "README.md", "data": await ejs.renderFile( readmeTmpl, options ) } );
            }
            else {

                // copy root readme
                if ( fs.existsSync( this.#rootPackage.root + "/README.md" ) ) {
                    fileTree.add( { "path": "README.md", "data": fs.readFileSync( this.#rootPackage.root + "/README.md" ) } );
                }

                // default readme
                else {
                    fileTree.add( { "path": "README.md", "data": await ejs.renderFile( readmeTmpl, options ) } );
                }
            }
        }

        // generate default sidebar
        if ( !fs.existsSync( options.locationPath + "/_sidebar.md" ) ) {
            fileTree.add( { "path": "_sidebar.md", "data": await ejs.renderFile( fs.resolve( "#resources/templates/docs/_sidebar.md", import.meta.url ), options ) } );
        }

        // generate .docs.config.yaml
        if ( !fs.existsSync( options.locationPath + "/_sidebar.md" ) ) {
            fileTree.add( { "path": ".docs.config.yaml", "data": await ejs.renderFile( fs.resolve( "#resources/templates/docs/.docs.config.yaml", import.meta.url ), options ) } );
        }

        await fileTree.write( options.locationPath );

        // copy .nojekyll
        this.#copyNoJekyll( options );
    }

    async #buildDefault ( options ) {
        const { "default": ejs } = await import( "ejs" ),
            { "default": File } = await import( "#lib/src/file" );

        // generate index.html
        let index = await ejs.renderFile( fs.resolve( "#resources/templates/docs/index.html", import.meta.url ), options );

        // lint index.html
        const res = await new File( options.locationPath + "/" + "index.html", { "data": index } ).run( "lint" );
        if ( !res.ok ) throw res;
        index = res.data;

        // write index.html
        fs.writeFileSync( options.locationPath + "/" + "index.html", index );

        // copy .nojekyll
        this.#copyNoJekyll( options );
    }

    async #buildAPISchemas ( options, type ) {
        if ( !options[type] ) return;

        const { "default": APISchema } = await import( "#core/app/api/schema" );

        // generate docs
        const schema = new APISchema( url.pathToFileURL( this.#rootPackage.root + "/" + options[type].location ) );

        const res = await schema.loadSchema();

        if ( !res.ok ) throw res;

        const fileTree = await schema.generate( { ...options[type], type } );

        // write files
        await fileTree.write( options.locationPath );
    }

    // XXX replace relative urls
    async #buildReadme ( options ) {
        const { "default": ejs } = await import( "ejs" );

        const readmePath = options.locationPath + "/README.md";

        if ( options.location === "root" || options.generateReadme === false || !fs.existsSync( readmePath ) ) return;

        const template = fs.resolve( "#resources/templates/docs/README.main.md.ejs", import.meta.url ),
            fileTree = new fs.FileTree();

        options.readmeContent = fs.readFileSync( readmePath, "utf8" ).trim();

        // XXX replace relative urls

        fileTree.add( { "path": "README.md", "data": await ejs.renderFile( template, options ) } );

        await fileTree.write( this.#rootPackage.root );
    }

    #copyNoJekyll ( options ) {
        fs.copyFileSync( fs.resolve( "#resources/templates/docs/.nojekyll", import.meta.url ), options.locationPath + "/.nojekyll" );
    }

    async #checkMarkdown ( options ) {
        const files = glob.sync( "**/*.md", {
            "cwd": options.locationPath,
            "nodir": true,
            "dot": true,
            "ignore": ["**/.git/**", "**/node_modules/**"],
        } );

        const warn = [];

        for ( const file of files ) {
            let markdown = fs.readFileSync( options.locationPath + "/" + file, "utf8" );

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
                    throw result( [500, `Code block in file "${file}" has no language identifier:\n${match}`] );
                }
            } );

            // check types
            {
                const blocks = markdown.split( /(````*)(.+?\1)/s ),
                    types = await options.getTypes();

                for ( let n = 0; n < blocks.length; n++ ) {

                    // code block start
                    if ( blocks[n].startsWith( "```" ) ) continue;

                    // code block body
                    if ( n && blocks[n - 1].startsWith( "```" ) ) continue;

                    for ( const match of blocks[n].matchAll( /<([\w.]+)(\[\])?\\>/g ) ) {
                        const type = match[1];

                        if ( type in types ) {
                            await options.addType( type );
                        }
                        else {
                            warn.push( `${ansi.warn( ` warn ` )} Type "${type}" in file "${file}" is undefined` );
                        }
                    }
                }
            }

            if ( changed ) fs.writeFileSync( options.locationPath + "/" + file, markdown );
        }

        return warn.join( "\n" );
    }

    async #initGitHubPages ( options ) {
        const branch = "main",
            path = options.location === "root" ? "/" : "/docs";

        process.stdout.write( `Initializing GitHub pages ... ` );

        var res;

        try {

            // GitHub pages init
            const upstream = await this.#rootPackage.git.getUpstream(),
                userConfig = await env.getUserConfig();

            if ( upstream.hosting !== "github" ) throw result( [500, `Upstream is not GitHub`] );

            if ( !userConfig.github?.token ) throw result( [500, `GitHub API token is not configured`] );

            const github = new GitHub( userConfig.github.token );

            res = await github.getPages( upstream.repoId );

            // pages created
            if ( res.ok ) {
                if ( path === res.data.source.path ) {
                    throw result( [200, `OK, branch: "${res.data.source.branch}", path: "${res.data.source.path}"`] );
                }

                // update location
                else {
                    res = await github.updatePages( upstream.repoId, { "source": { branch, path } } );

                    if ( res.ok ) throw result( [200, `Updated, branch: "${branch}", path: "${path}"`] );
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
