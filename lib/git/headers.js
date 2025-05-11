import { toHeaderCase } from "#core/naming-conventions";

const ISSUE_REGEXP = /^#(\d+)$/;

export default class Headers {
    #headers = new Map();
    #breakingChangeText;
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

    get breakingChangeText () {
        if ( this.#breakingChangeText === undefined ) {
            this.#breakingChangeText = this.get( "breaking-change" )?.join( "\n" ) ?? null;
        }

        return this.#breakingChangeText;
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
        return this.#headers.has( name?.toLowerCase() );
    }

    get ( name ) {
        return this.#headers?.get( name.toLowerCase() )?.values;
    }

    add ( headers ) {
        for ( const [ key, values ] of Object.entries( headers ) ) {
            let name = key;

            if ( /^BREAKING[ -]CHANGE$/.test( name ) ) {
                name = "BREAKING-CHANGE";
            }
            else {
                name = toHeaderCase( name );
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
                for ( const header of [ ...this.#headers.values() ].sort( ( a, b ) => a.name.localeCompare( b.name ) ) ) {
                    if ( header.values.length ) {
                        for ( const value of header.values ) {
                            lines.push( header.name + ": " + value );
                        }
                    }
                    else {
                        lines.push( header.name + ":" );
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
        this.#breakingChangeText = undefined;
        this.#issues = undefined;
        this.#fixes = undefined;
    }

    #extractIssues ( header ) {
        const issues = new Set();

        for ( const values of this.get( header ) || [] ) {
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
