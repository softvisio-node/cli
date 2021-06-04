import fs from "#core/fs";
import url from "url";

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
        const { "default": APISchema } = await import( "#core/app/api/schema" ),
            { "default": ejs } = await import( "ejs" ),
            location = this.#rootPackage.root + "/" + DOCS_LOCATION,
            config = this.#rootPackage.docsConfig;

        process.stdout.write( `Building documentation ... ` );

        // check docs config
        if ( !this.isExists ) return this.#done( result( [404, `Documentation config wasn't found.`] ) );

        // generate api schema
        if ( config.api ) {

            // generate docs
            for ( const source in config.api ) {
                const schema = new APISchema( url.pathToFileURL( this.#rootPackage.root + "/" + source ) );

                const res = await schema.loadSchema();

                if ( !res.ok ) return this.#done( res );

                const fileTree = await schema.generate( config.api[source].options );

                // update files
                const dir = location + "/" + config.api[source].target;

                if ( fs.existsSync( dir ) ) fs.rmSync( dir, { "recursive": true } );

                await fileTree.write( dir );
            }
        }

        const fileTree = new fs.FileTree(),
            upstream = await this.#rootPackage.git.getUpstream(),
            options = {
                "name": config.name,
                "siteURL": config.siteURL || upstream.pagesURL,
                "readmeContent": null,
                "sourceURL": upstream.homeURL,
                "issuesURL": upstream.issuesURL,
                "discussionsURL": upstream.discussionsURL,
                "npmURL": this.#rootPackage.npmURL,
            };

        // XXX generate default readme
        // XXX generate default sidebar

        const readmePath = location + "/README.md";

        // generate README.md
        if ( config.updateReadme && fs.existsSync( readmePath ) ) {
            const template = fs.resolve( "#resources/templates/docs/README.md", import.meta.url );

            // XXX replace relative urls
            options.readmeContent = fs.readFileSync( readmePath );

            fileTree.add( { "path": "README.md", "data": await ejs.renderFile( template, options ) } );
        }

        // generate index.html
        const template = fs.resolve( "#resources/templates/docs/index.html", import.meta.url );

        fileTree.add( { "path": DOCS_LOCATION + "/index.html", "data": await ejs.renderFile( template, options ) } );

        await fileTree.write( this.#rootPackage.root );

        return this.#done( result( 200 ) );
    }

    // private
    #done ( res ) {
        console.log( res + "" );

        return res;
    }
}
