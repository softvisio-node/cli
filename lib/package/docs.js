import fs from "#core/fs";
import url from "url";
import Options from "./docs/options.js";

const DOCS_LOCATION = "docs";

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
    async build () {
        process.stdout.write( `Building documentation ... ` );

        var res;

        try {

            // check docs config
            if ( !this.isExists ) throw result( [404, `Documentation config wasn't found.`] );

            const options = await Options.new( this.#rootPackage, this.#rootPackage.docsConfig );

            await this.#buildDefault( options );
            await this.#buildAPISchemas( options );
            await this.#buildReadme( options );

            res = result( 200 );
        }
        catch ( e ) {
            res = result.catchResult( e );
        }

        console.log( res + "" );

        return res;
    }

    // private
    async #buildDefault ( options ) {
        const { "default": ejs } = await import( "ejs" ),
            fileTree = new fs.FileTree();

        // generate default readme
        if ( !fs.existsSync( this.#rootPackage.root + "/" + DOCS_LOCATION + "/README.md" ) ) {
            fileTree.add( { "path": "README.md", "data": await ejs.renderFile( fs.resolve( "#resources/templates/docs/docs/README.md", import.meta.url ), options ) } );
        }

        // generate default sidebar
        if ( !fs.existsSync( this.#rootPackage.root + "/" + DOCS_LOCATION + "/_sidebar.md" ) ) {
            fileTree.add( { "path": "_sidebar.md", "data": await ejs.renderFile( fs.resolve( "#resources/templates/docs/docs/_sidebar.md", import.meta.url ), options ) } );
        }

        // generate index.html
        fileTree.add( { "path": "index.html", "data": await ejs.renderFile( fs.resolve( "#resources/templates/docs/docs/index.html", import.meta.url ), options ) } );

        await fileTree.write( this.#rootPackage.root + "/" + DOCS_LOCATION );
    }

    async #buildAPISchemas ( options ) {
        if ( options.api ) return;

        const { "default": APISchema } = await import( "#core/app/api/schema" ),
            location = this.#rootPackage.root + "/" + DOCS_LOCATION;

        // generate docs
        for ( const source in options.api ) {
            const schema = new APISchema( url.pathToFileURL( this.#rootPackage.root + "/" + source ) );

            const res = await schema.loadSchema();

            if ( !res.ok ) throw res;

            const fileTree = await schema.generate( options.api[source].options );

            // update files
            const dir = location + "/" + options.api[source].target;

            if ( fs.existsSync( dir ) ) fs.rmSync( dir, { "recursive": true } );

            await fileTree.write( dir );
        }
    }

    // XXX replace relative urls
    async #buildReadme ( options ) {
        const { "default": ejs } = await import( "ejs" );

        const readmePath = this.#rootPackage.root + "/" + DOCS_LOCATION + "/README.md";

        if ( options.generateReadme === false || !fs.existsSync( readmePath ) ) return;

        const template = fs.resolve( "#resources/templates/docs/README.md", import.meta.url ),
            fileTree = new fs.FileTree();

        options.readmeContent = fs.readFileSync( readmePath );

        // XXX replace relative urls

        fileTree.add( { "path": "README.md", "data": await ejs.renderFile( template, options ) } );

        await fileTree.write( this.#rootPackage.root );
    }
}
