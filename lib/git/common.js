const KNOWN_TYPES = new Set( [ "feat", "fix" ] ),
    BREAKING_CHANGE_PRIORITY = {
        "true": 100,
        "false": 200,
    },
    NO_BREAKING_CHANGE_PRIORITY = 300,
    TYPE_PRIORITY = {
        "feat": 1,
        "fix": 2,
    },
    OTHER_TYPE_PRIORITY = 98,
    NO_TYPE_PRIORITY = 99;

export default class Priority {
    #message;
    #body;
    #links;
    #fixes;

    // properties
    get priority () {
        return this.breakingChangePriority + this.typePriority;
    }

    get breakingChangePriority () {
        return BREAKING_CHANGE_PRIORITY[ this.isBreakingChange ] || NO_BREAKING_CHANGE_PRIORITY;
    }

    get typePriority () {
        if ( !this.type ) return NO_TYPE_PRIORITY;

        return TYPE_PRIORITY[ this.type ] || OTHER_TYPE_PRIORITY;
    }

    get semverType () {
        if ( this.isBreakingChange ) {
            return "MAJOR";
        }
        else if ( this.isFeature ) {
            return "MINOR";
        }
        else {
            return "PATCH";
        }
    }

    get isFeature () {
        return this.type === "feat";
    }

    get isFix () {
        return this.type === "fix";
    }

    get isOther () {
        return !KNOWN_TYPES.has( this.type );
    }

    get isMerge () {
        return !this.type && this.subjectText.startsWith( "Merge branch " );
    }

    get isRevert () {
        return !this.type && ( this.subjectText.startsWith( "Revert " ) || this.subjectText.startsWith( "Reapply " ) );
    }

    get message () {
        this.#message ??= this.subject + ( this.body
            ? "\n\n" + this.body
            : "" );

        return this.#message;
    }

    get subject () {
        let subject = "";

        if ( this.type ) {
            subject += this.type;

            if ( this.scope ) {
                subject += "(" + this.scope + ")";
            }

            if ( this.isBreakingChange ) {
                subject += "!";
            }

            subject += ": " + this.subjectText;
        }
        else {
            subject = this.subjectText;
        }

        return subject;
    }

    get body () {
        if ( this.#body == null ) {
            this.#body = "";

            if ( this.bodyText ) {
                if ( this.isBreakingChange && !this.type ) {
                    this.#body += "BREAKING-CHANGE: " + this.bodyText;
                }
                else {
                    this.#body += this.bodyText;
                }

                if ( this.footers.size ) {
                    if ( this.#body ) this.#body += "\n\n";

                    this.#body += this.footers.toString();
                }
            }
            else {
                if ( this.isBreakingChange && !this.type ) {
                    this.#body += "BREAKING-CHANGE:";
                }

                if ( this.footers.size ) {
                    if ( this.#body ) this.#body += "\n";

                    this.#body += this.footers.toString();
                }
            }
        }

        return this.#body;
    }

    get links () {
        if ( this.#links === undefined ) {
            const links = [ ...new Set( [ ...this.message.matchAll( /(?:^|\s)((?:[\w.-]+\/[\w.-]+)?#\d+)(?:\s|$)/g ) ].map( match => match[ 1 ] ) ) ].sort( ( a, b ) => {
                const [ aRepo, aId ] = a.split( "#" ),
                    [ bRepo, bId ] = b.split( "#" );

                return aRepo - bRepo || Number( aId ) - Number( bId );
            } );

            this.#links = links.length
                ? links
                : null;
        }

        return this.#links;
    }

    get fixes () {
        if ( this.#fixes === undefined ) {
            const links = [ ...new Set( [ ...this.message.matchAll( /(?:^|\s)(?:close[ds]?|fix(?:es|ed)?|resolve(?:s|ds)?) *:? +((?:[\w.-]+\/[\w.-]+)?#\d+)(?:\s|$)/g ) ].map( match => match[ 1 ] ) ) ].sort( ( a, b ) => {
                const [ aRepo, aId ] = a.split( "#" ),
                    [ bRepo, bId ] = b.split( "#" );

                return aRepo - bRepo || Number( aId ) - Number( bId );
            } );

            this.#fixes = links.length
                ? links
                : null;
        }

        return this.#fixes;
    }

    // public
    toString () {
        return this.subject;
    }

    toJSON () {
        return this.toString();
    }

    getChangelogSubject () {
        var subject = [ `[${ this.semverType }] ${ this.subject }` ];

        if ( this.links ) {
            subject.push( `(Issues: ${ this.links.join( ", " ) })` );
        }

        if ( this.fixes ) {
            subject.push( `(Fix: ${ this.fixes.join( ", " ) })` );
        }

        return subject.join( " " );
    }

    compare ( commit ) {
        return this.priority - commit.priority || this.type.localeCompare( commit.type ) || this.scope.localeCompare( commit.scope ) || this.subjectText.localeCompare( commit.subjectText ) || 0;
    }

    // protected
    _clearCache () {
        this.#message = undefined;
        this.#body = undefined;
        this.#links = undefined;
        this.#fixes = undefined;
    }
}
