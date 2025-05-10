import { toPascalCase } from "#core/naming-conventions";

export default class Footers {
    #footers = new Map();

    // properties
    get size () {
        return this.#footers.size;
    }

    get isBreakingChange () {
        return this.has( "breaking-change" );
    }

    // public
    has ( name ) {
        return this.#footers.has( name?.toLowerCase() );
    }

    get ( name ) {
        return this.#footers?.get( name.toLowerCase() );
    }

    add ( footers ) {
        for ( const [ key, values ] of Object.entries( footers ) ) {
            if ( !values.length ) continue;

            let name = key;

            if ( name === "BREAKING CHANGE" ) {
                name = "BREAKING-CHANGE";
            }
            else {
                name = toPascalCase( name );
            }

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
        }
    }

    toString () {
        if ( !this.size ) return "";

        const lines = [];

        for ( const footer of this.#footers.values() ) {
            for ( const value of footer.values ) {
                lines.push( footer.name + ": " + value );
            }
        }

        return lines.join( "\n" );
    }
}
