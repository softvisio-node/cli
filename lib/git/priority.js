const KNOWN_TYPES = new Set( [ "feat", "fix" ] ),
    BREAKING_PRIORITY = {
        "true": 1,
        "false": 10,
    },
    NO_BREAKING_PRIORITY = 20,
    TYPE_PRIORITY = {
        "feat": 1,
        "fix": 2,
    },
    OTHER_TYPE_PRIORITY = 8,
    NO_TYPE_PRIORITY = 9;

export default class Priority {

    // properties
    get priority () {
        return this.breakingPriority + this.typePriority;
    }

    get breakingPriority () {
        return BREAKING_PRIORITY[ this.isBreaking ] || NO_BREAKING_PRIORITY;
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
        return !this.type && this.subject.startsWith( "Merge branch " );
    }

    get isRevert () {
        return !this.type && ( this.subject.startsWith( "Revert " ) || this.subject.startsWith( "Reapply " ) );
    }
}
