import { toHeaderCase } from "#core/naming-conventions";

export default class Footers {
    #footers = new Map();
    #toString;

    // properties
    get size () {
        return this.#footers.size;
    }

    // public
    has ( name ) {
        return this.#footers.has( name?.toLowerCase() );
    }

    get ( name ) {
        return this.#footers?.get( name.toLowerCase() )?.values;
    }

    add ( name, value ) {
        name = toHeaderCase( name.trim() );
        value = value.trim();

        const values = value
            ? [ value ]
            : [];

        const id = name.toLowerCase();

        if ( this.has( id ) ) {
            this.#footers.get( id ).values.push( ...values );
        }
        else {
            this.#footers.set( id, {
                name,
                values,
            } );
        }

        this.#clear();
    }

    toString () {
        if ( this.#toString == null ) {
            const lines = [];

            if ( this.size ) {
                for ( const footer of [ ...this.#footers.values() ].sort( ( a, b ) => a.name.localeCompare( b.name ) ) ) {
                    if ( footer.values.length ) {
                        for ( const value of footer.values ) {
                            lines.push( footer.name + ": " + value );
                        }
                    }
                    else {
                        lines.push( footer.name + ":" );
                    }
                }
            }

            this.#toString = lines.join( "\n" );
        }

        return this.#toString;
    }

    // private
    #clear () {
        this.#toString = undefined;
    }
}
