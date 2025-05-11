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
        this.#body ??= [ this.bodyText, this.footers.toString() ].filter( block => block ).join( "\n\n" );

        return this.#body;
    }

    // public
    toString () {
        return this.subject;
    }

    toJSON () {
        return this.toString();
    }

    compare ( commit ) {
        return this.priority - commit.priority || this.type.localeCompare( commit.type ) || this.scope.localeCompare( commit.scope ) || this.subjectText.localeCompare( commit.subjectText ) || 0;
    }
}
