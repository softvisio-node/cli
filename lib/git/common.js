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
    NO_TYPE_PRIORITY = 99,
    SYMBOLS = {
        "fixes": "✅",
        "links": "🔗",
        "commits": "●",
        "authors": "👬",
    };

export default class Priority {
    #message;
    #body;
    #changelogSubject;

    // static
    static get compareLinks () {
        return ( a, b ) => {
            const [ aRepo, aId ] = a.split( "#" ),
                [ bRepo, bId ] = b.split( "#" );

            return aRepo - bRepo || Number( aId ) - Number( bId );
        };
    }

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

    get isRevert () {
        return !this.type && ( this.subjectText.startsWith( "Revert " ) || this.subjectText.startsWith( "Reapply " ) );
    }

    get isMergeSubject () {
        return this.subject.startsWith( "Merge " );
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

    // public
    toString () {
        return this.subject;
    }

    toJSON () {
        return this.toString();
    }

    getChangelogSubject () {
        if ( !this.#changelogSubject ) {
            var subject = [ `[${ this.semverType }] ${ this.subject }` ];

            const fixes = [ ...this.fixes ].join( ", " ),
                links = [ ...this.links ].filter( link => !this.fixes.has( link ) ).join( ", " ),
                commits = [ ...this.commits.values() ].map( commit => commit.abbrev ).join( ", " ),
                tags = [];

            if ( fixes ) tags.push( SYMBOLS.fixes + " " + fixes );
            if ( links ) tags.push( SYMBOLS.links + " " + links );
            if ( commits ) tags.push( SYMBOLS.commits + " " + commits );
            tags.push( SYMBOLS.authors + " " + [ ...this.authors ].join( ", " ) );

            if ( tags.length ) {
                subject.push( "(" + tags.join( "; " ) + ")" );
            }

            this.#changelogSubject = subject.join( " " );
        }

        return this.#changelogSubject;
    }

    compare ( commit ) {
        return this.priority - commit.priority || this.type.localeCompare( commit.type ) || this.scope.localeCompare( commit.scope ) || this.subjectText.localeCompare( commit.subjectText ) || 0;
    }

    // protected
    _clearCache () {
        this.#message = undefined;
        this.#body = undefined;
        this.#changelogSubject = undefined;
    }
}
