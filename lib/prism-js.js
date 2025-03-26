import fetch from "#core/fetch";

class Prism {
    #db;

    // public
    async init () {
        return this.#init();
    }

    getLanguage ( language ) {
        return this.#db[ language ];
    }

    // private
    async #init () {
        const res = await fetch( "https://raw.githubusercontent.com/PrismJS/prism/master/components.json" );
        if ( !res.ok ) return res;

        const components = await res.json();

        this.#db = {};

        for ( const [ language, config ] of Object.entries( components.languages ) ) {
            this.#db[ language ] = language;

            if ( config.alias ) {
                for ( const alias of config.alias ) {
                    this.#db[ alias ] = language;
                }
            }
        }
    }
}

export default new Prism();
