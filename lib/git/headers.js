import { toPascalCase } from "#core/naming-conventions";

export default class Headers {
    #headers = new Map();
    #issues;
    #fixes;
    #toString;

    // properties
    get size () {
        return this.#headers.size;
    }

    get isBreakingChange () {
        return this.has( "breaking-change" );
    }

    get issues () {
        if ( !this.#issues ) {
            this.#issues = this.#extractIssues( "issue" );
        }

        return this.#issues;
    }

    get fixes () {
        if ( !this.#fixes ) {
            this.#fixes = this.#extractIssues( "fix" );
        }

        return this.#fixes;
    }

    // public
    has ( name ) {
        return this.#headers.has( name?.toLowerCase() );
    }

    get ( name ) {
        return this.#headers?.get( name.toLowerCase() )?.values;
    }

    add ( headers ) {
        for ( const [ key, values ] of Object.entries( headers ) ) {
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
                this.#headers.get( id ).values.push( ...values );
            }
            else {
                this.#headers.set( id, {
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
                for ( const header of this.#headers.values() ) {
                    for ( const value of header.values ) {
                        lines.push( header.name + ": " + value );
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

    #extractIssues ( header ) {
        const issues = new Set();

        for ( const issue of this.get( header ) || [] ) {
            const match = issue.match( /^#?(\d+)$/ );

            if ( match ) {
                issues.add( Number( match[ 1 ] ) );
            }
        }

        return [ ...issues ].sort();
    }
}
