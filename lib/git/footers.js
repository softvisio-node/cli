import { toHeaderCase } from "#core/naming-conventions";

const ISSUE_REGEXP = /^#(\d+)$/;

export default class Footers {
    #footers = new Map();
    #issues;
    #fixes;
    #toString;

    // properties
    get size () {
        return this.#footers.size;
    }

    get issues () {
        if ( this.#issues === undefined ) {
            this.#issues = this.#extractIssues( "issue" );
        }

        return this.#issues;
    }

    get fixes () {
        if ( this.#fixes === undefined ) {
            this.#fixes = this.#extractIssues( "fix" );
        }

        return this.#fixes;
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
                "values": values,
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
        this.#issues = undefined;
        this.#fixes = undefined;
    }

    #extractIssues ( footer ) {
        const issues = new Set();

        for ( const values of this.get( footer ) || [] ) {
            for ( const issue of values.split( "," ) ) {
                const match = issue.trim().match( ISSUE_REGEXP );

                if ( match ) {
                    issues.add( Number( match[ 1 ] ) );
                }
            }
        }

        if ( !issues.size ) return null;

        return [ ...issues ].sort();
    }
}
