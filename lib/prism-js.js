import { readConfigSync } from "#core/config";
import externalResources from "#core/external-resources";

const coreLanguages = new Set( [ "javascript", "css", "html" ] ),
    languages = new Map(),
    resource = await externalResources
        .add( "softvisio-node/core/resources/prism-js" )
        .on( "update", () => languages.clear() )
        .check();

class PrismJs {

    // public
    isCoreLanguage ( language ) {
        return coreLanguages.has( this.getLanguage( language ) );
    }

    getLanguage ( language ) {
        if ( !languages.size ) this.#init();

        return languages.get( language );
    }

    // private
    async #init () {
        const components = readConfigSync( resource.getResourcePath( "components.json" ) );

        for ( const [ language, config ] of Object.entries( components.languages ) ) {
            languages.set( language, language );

            if ( config.alias ) {
                for ( const alias of config.alias ) {
                    languages.set( alias, language );
                }
            }
        }
    }
}

export default new PrismJs();
