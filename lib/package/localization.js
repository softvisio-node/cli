import glob from "#core/glob";

export default class {
    #pkg;

    constructor ( pkg ) {
        this.#pkg = pkg;
    }

    // public
    async update () {
        const files = glob( "**/*.po", { "directiries": false } );

        console.log( files );

        return result( 200 );
    }
}
