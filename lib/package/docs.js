import fs from "#core/fs";
import url from "url";

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
        const { "default": APISchema } = await import( "#core/app/api/schema" );

        process.stdout.write( `Building documentation ... ` );

        // check docs config
        if ( !this.isExists ) return this.#done( result( [404, `Documentation config wasn't found.`] ) );

        if ( !this.#rootPackage.docsConfig.location ) return this.#done( result( [404, `API documentation location is not defined.`] ) );

        if ( !this.#rootPackage.docsConfig.api || !this.#rootPackage.docsConfig.api.length ) return this.#done( result( [404, `API documentation config wasn't found.`] ) );

        // generate docs
        for ( const cfg of this.#rootPackage.docsConfig.api ) {
            const schema = new APISchema( url.pathToFileURL( this.#rootPackage.root + "/" + cfg.source ) );

            const res = await schema.loadSchema();

            if ( !res.ok ) return this.#done( res );

            const fileTree = await schema.generate();

            // update files
            const dir = this.#rootPackage.root + "/" + this.#rootPackage.docsConfig.location + "/" + cfg.target;

            if ( fs.existsSync( dir ) ) fs.rmSync( dir, { "recursive": true } );

            await fileTree.write( dir );
        }

        return this.#done( result( 200 ) );
    }

    // private
    #done ( res ) {
        console.log( res + "" );

        return res;
    }
}
