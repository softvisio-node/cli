export default class {

    // public
    create ( editorConfig ) {
        const config = this.wrap( [] );

        if ( editorConfig ) {
            config.push( ...this.customize( editorConfig ) );
        }

        return config;
    }

    wrap ( config ) {
        return config;
    }

    customize ( editorConfig ) {
        return [];
    }
}
