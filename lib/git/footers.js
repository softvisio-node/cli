import { toPascalCase } from "#core/naming-conventions";

const ISSUES_FOOTERS = [ "fix", "issue" ];

export default class Footers {
    #footers = new Map();
    #issues;
    #toString;

    // properties
    get size () {
        return this.#footers.size;
    }

    get isBreakingChange () {
        return this.has( "breaking-change" );
    }

    get issues () {
        if ( !this.#issues ) {
            const issues = new Set();

            for ( const footer of ISSUES_FOOTERS ) {
                for ( const issue of this.get( footer ) || [] ) {
                    const match = issue.match( /^#?(\d+)$/ );

                    if ( match ) {
                        issues.add( Number( match[ 1 ] ) );
                    }
                }
            }

            this.#issues = [ ...issues ].sort();
        }

        return this.#issues;
    }

    // public
    has ( name ) {
        return this.#footers.has( name?.toLowerCase() );
    }

    get ( name ) {
        return this.#footers?.get( name.toLowerCase() )?.values;
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

        this.#clear();
    }

    toString () {
        if ( this.#toString == null ) {
            const lines = [];

            if ( this.size ) {
                for ( const footer of this.#footers.values() ) {
                    for ( const value of footer.values ) {
                        lines.push( footer.name + ": " + value );
                    }
                }
            }

            this.#toString = lines.join( "\n" );
        }

        return this.#toString;
    }

    // private
    #clear () {
        this.#issues = undefined;
        this.#toString = undefined;
    }
}
