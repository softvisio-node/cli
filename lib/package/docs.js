import fs from "#core/fs";
import url from "url";
import Options from "./docs/options.js";
import glob from "glob";

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

        try {
            const options = await Options.new( this.#rootPackage, this.#rootPackage.docsConfig || { "location": "docs" } );

            await this.#init( options );

            res = result( 200 );
        }
        catch ( e ) {
            res = result.catch( e );
        }

        console.log( res + "" );

        return res;
    }

    async build () {
        process.stdout.write( `Building documentation ... ` );

        var res;

        try {

            // check docs config
            if ( !this.isExists ) throw result( [404, `Documentation config wasn't found.`] );

            const options = await Options.new( this.#rootPackage, this.#rootPackage.docsConfig );

            await this.#buildAPISchemas( options, "api" );
            await this.#buildAPISchemas( options, "rpc" );
            await this.#buildDefault( options );
            await this.#buildReadme( options );

            res = result( 200 );
        }
        catch ( e ) {
            res = result.catch( e );
        }

        console.log( res + "" );

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

        // check markdown files
        this.#checkMarkdown( options );

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
        for ( const source of options[type] ) {
            const schema = new APISchema( url.pathToFileURL( this.#rootPackage.root + "/" + source ) );

            const res = await schema.loadSchema();

            if ( !res.ok ) throw res;

            const fileTree = await schema.generate( { type } );

            // write files
            await fileTree.write( options.locationPath );
        }
    }

    // XXX replace relative urls
    async #buildReadme ( options ) {
        const { "default": ejs } = await import( "ejs" );

        const readmePath = options.locationPath + "/README.md";

        if ( options.location === "root" || options.generateReadme === false || !fs.existsSync( readmePath ) ) return;

        const template = fs.resolve( "#resources/templates/docs/README.main.md", import.meta.url ),
            fileTree = new fs.FileTree();

        options.readmeContent = fs.readFileSync( readmePath );

        // XXX replace relative urls

        fileTree.add( { "path": "README.md", "data": await ejs.renderFile( template, options ) } );

        await fileTree.write( this.#rootPackage.root );
    }

    #copyNoJekyll ( options ) {
        fs.copyFileSync( fs.resolve( "#resources/templates/docs/.nojekyll", import.meta.url ), options.locationPath + "/.nojekyll" );
    }

    #checkMarkdown ( options ) {
        const files = glob.sync( "**/*.md", {
            "cwd": options.locationPath,
            "nodir": true,
            "dot": true,
            "ignore": ["**/.git/**", "**/node_modules/**"],
        } );

        for ( const file of files ) {
            let markdown = fs.readFileSync( options.locationPath + "/" + file, "utf8" );

            let changed;

            // check code languages
            markdown = markdown.replaceAll( /```(\w*?)(\n.*?```)/gms, ( match, language, body ) => {
                if ( language ) {
                    const languageAlias = options.addLanguage( language );

                    if ( language !== languageAlias ) {
                        changed = true;

                        return "```" + languageAlias + body;
                    }
                    else {
                        return match;
                    }
                }
                else {
                    throw result( [500, `Code block in file "${file}" has no language identifier:\n${match}`] );
                }
            } );

            if ( changed ) fs.writeFileSync( options.locationPath + "/" + file, markdown );
        }
    }
}
