import { readConfigSync } from "#core/config";
import externalResources from "#core/external-resources";

const coreLanguages = new Set(),
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
        coreLanguages.clear();

        const components = readConfigSync( resource.getResourcePath( "components.json" ) );

        for ( const [ language, config ] of Object.entries( components.languages ) ) {
            languages.set( language, language );

            if ( config.option === "default" ) {
                coreLanguages.add( language );
            }

            if ( config.alias ) {
                let aliases = config.alias;

                if ( !Array.isArray( aliases ) ) aliases = [ aliases ];

                for ( const alias of aliases ) {
                    languages.set( alias, language );

                    if ( config.option === "default" ) {
                        coreLanguages.add( alias );
                    }
                }
            }
        }
    }
}

export default new PrismJs();
