import fs from "#core/fs";
import url from "url";
import Options from "./docs/options.js";

const DEFAULT_DOCS_LOCATION = "docs";

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

            // check docs config
            if ( this.isExists ) throw result( [404, `Documentation already initialized.`] );

            await this.#init();

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

            await this.#buildDefault( options );
            await this.#buildAPISchemas( options, "api" );
            await this.#buildAPISchemas( options, "rpc" );
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
    async #init () {
        const { "default": ejs } = await import( "ejs" ),
            fileTree = new fs.FileTree();

        // generate .config.yaml
        fileTree.add( { "path": ".config.yaml", "data": await ejs.renderFile( fs.resolve( "#resources/templates/docs/docs/.config.yaml", import.meta.url ), {} ) } );

        await fileTree.write( this.#rootPackage.root + "/" + DEFAULT_DOCS_LOCATION );

        // copy .nojekyll
        this.#copyNoJekyll();

        // copy README.md
        if ( fs.existsSync( this.#rootPackage.root + "/README.md" ) ) {
            fs.copyFileSync( this.#rootPackage.root + "/README.md", this.#rootPackage.root + "/" + DEFAULT_DOCS_LOCATION + "/README.md" );
        }
    }

    async #buildDefault ( options ) {
        const { "default": ejs } = await import( "ejs" ),
            fileTree = new fs.FileTree(),
            { "default": File } = await import( "#lib/src/file" );

        // generate default readme
        if ( !fs.existsSync( this.#rootPackage.root + "/" + DEFAULT_DOCS_LOCATION + "/README.md" ) ) {
            fileTree.add( { "path": "README.md", "data": await ejs.renderFile( fs.resolve( "#resources/templates/docs/docs/README.md", import.meta.url ), options ) } );
        }

        // generate default sidebar
        if ( !fs.existsSync( this.#rootPackage.root + "/" + DEFAULT_DOCS_LOCATION + "/_sidebar.md" ) ) {
            fileTree.add( { "path": "_sidebar.md", "data": await ejs.renderFile( fs.resolve( "#resources/templates/docs/docs/_sidebar.md", import.meta.url ), options ) } );
        }

        // index.html
        {

            // generate index.html
            const index = fileTree.add( { "path": "index.html", "data": await ejs.renderFile( fs.resolve( "#resources/templates/docs/docs/index.html", import.meta.url ), options ) } );

            // lint index.html
            const res = await new File( index.path, { "data": await index.text() } ).run( "lint" );
            if ( !res.ok ) throw res;
            index.data = res.data;
        }

        await fileTree.write( this.#rootPackage.root + "/" + DEFAULT_DOCS_LOCATION );

        // copy .nojekyll
        this.#copyNoJekyll();
    }

    async #buildAPISchemas ( options, type ) {
        if ( !options[type] ) return;

        const { "default": APISchema } = await import( "#core/app/api/schema" ),
            location = this.#rootPackage.root + "/" + DEFAULT_DOCS_LOCATION;

        // generate docs
        for ( const config of options[type] ) {
            const schema = new APISchema( url.pathToFileURL( this.#rootPackage.root + "/" + config.source ) );

            const res = await schema.loadSchema();

            if ( !res.ok ) throw res;

            const fileTree = await schema.generate( { "type": type.toUpperCase() } );

            // update files
            const dir = location + "/" + config.target;

            if ( fs.existsSync( dir ) ) fs.rmSync( dir, { "recursive": true } );

            await fileTree.write( dir );
        }
    }

    // XXX replace relative urls
    async #buildReadme ( options ) {
        const { "default": ejs } = await import( "ejs" );

        const readmePath = this.#rootPackage.root + "/" + DEFAULT_DOCS_LOCATION + "/README.md";

        if ( options.generateReadme === false || !fs.existsSync( readmePath ) ) return;

        const template = fs.resolve( "#resources/templates/docs/README.md", import.meta.url ),
            fileTree = new fs.FileTree();

        options.readmeContent = fs.readFileSync( readmePath );

        // XXX replace relative urls

        fileTree.add( { "path": "README.md", "data": await ejs.renderFile( template, options ) } );

        await fileTree.write( this.#rootPackage.root );
    }

    #copyNoJekyll () {
        fs.copyFileSync( fs.resolve( "#resources/templates/docs/docs/.nojekyll", import.meta.url ), this.#rootPackage.root + "/" + DEFAULT_DOCS_LOCATION + "/.nojekyll" );
    }
}
