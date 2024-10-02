export default class {

    // public
    create ( editorConfig ) {
        return [

            //
            ...this.wrap(),
            ...this.customize( editorConfig ),
        ];
    }

    wrap ( config ) {
        return this._wrap( config || [] );
    }

    customize ( editorConfig ) {
        if ( !editorConfig ) return [];

        return this._customize( editorConfig );
    }

    // protected
    _wrap ( config ) {
        return config;
    }

    _customize ( editorConfig ) {
        return [];
    }
}
