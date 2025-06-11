import ejs from "#core/ejs";
import Markdown from "#core/markdown";
import { resolve } from "#core/utils";

const TITLES = {
        "feat": "New features",
        "fix": "Fixes",
        "refactor": "Refactoring",
    },
    DEFAULT_COMMIT_TYPES = {
        "feat": {
            "primaryChange": true,
            "notableChange": true,
        },
        "fix": {
            "primaryChange": true,
            "notableChange": true,
        },
    };

export default class GitChangelog {
    #changes;
    #upstream;
    #previousRelease;
    #currentRelease;
    #changesGroups;
    #hasNotableChanges = false;
    #report;

    constructor ( changes, { upstream, previousRelease, currentRelease, commitTypes } ) {
        this.#changes = changes;
        this.#upstream = upstream;
        this.#previousRelease = previousRelease;
        this.#currentRelease = currentRelease;

        this.#indexChanges( commitTypes || DEFAULT_COMMIT_TYPES );
    }

    // properties
    get previousRelease () {
        return this.#previousRelease;
    }

    get currentRelease () {
        return this.#currentRelease;
    }

    get changes () {
        return this.#changes;
    }

    get hasChanges () {
        return this.#changes.hasChanges;
    }

    get hasNotableChanges () {
        return this.#hasNotableChanges;
    }

    get hasBreakingChanges () {
        return this.#changes.hasBreakingChanges;
    }

    // public
    async createChangelog ( { currentRelease, header, text, ansi = true } = {} ) {
        currentRelease ||= this.#currentRelease;

        var changelog = await ejs.renderFile( resolve( "#resources/templates/changelog.md.ejs", import.meta.url ), {
            "changelog": this,
            currentRelease,
            "changesGroups": this.#changesGroups,
            "compareUrl": !this.#previousRelease || !currentRelease
                ? null
                : this.#upstream?.getCompareUrl( this.#previousRelease.versionString, currentRelease.versionString ),
        } );

        changelog = changelog.trim();

        if ( header ) {
            changelog = this.#createHeader( currentRelease ) + "\n\n" + changelog;
        }

        if ( text ) {
            return this.convertMarkdownToText( changelog, { ansi, "linkify": true } );
        }
        else {
            return changelog;
        }
    }

    createChangesList ( { currentRelease, text = true, ansi = true } = {} ) {
        currentRelease ||= this.#currentRelease;

        const lines = [];

        lines.push( this.#createHeader( currentRelease ) );

        if ( this.hasChanges ) {
            for ( const group of this.#changesGroups ) {
                if ( !group.changes.length ) continue;

                lines.push( "" );
                lines.push( `**${ group.name }:**` );

                for ( const change of group.changes ) {
                    lines.push( `- ${ change.getChangelogSubject( {
                        "withSemanticVersionType": group.primaryChange,
                        "withCommits": true,
                    } ) }` );
                }
            }
        }

        const changelog = lines.join( "\n" );

        if ( text ) {
            return this.convertMarkdownToText( changelog, { ansi, "linkify": true } );
        }
        else {
            return changelog;
        }
    }

    createReport () {
        if ( !this.#report ) {
            const lines = [];

            let titleLength = 0;

            lines.push( [ "Total changes", this.#changes.size ] );
            if ( titleLength < lines.at( -1 )[ 0 ].length ) titleLength = lines.at( -1 )[ 0 ].length;

            for ( const group of this.#changesGroups ) {
                if ( !group.report && !group.changes.length ) continue;

                lines.push( [ group.name, group.changes.length ] );

                if ( titleLength < lines.at( -1 )[ 0 ].length ) titleLength = lines.at( -1 )[ 0 ].length;
            }

            this.#report = lines.map( ( [ title, count ] ) => `${ ( title + ":" ).padEnd( titleLength + 1 ) } ${ count || "-" }` ).join( "\n" );
        }

        return this.#report;
    }

    convertMarkdownToText ( markdown, { ansi, linkify } = {} ) {
        if ( linkify ) {
            markdown = this.linkifyMarkdown( markdown );
        }

        return new Markdown( markdown ).toString( { ansi } ).trim();
    }

    linkifyMarkdown ( text ) {
        if ( this.#upstream ) {
            text = this.#upstream.linkifyMarkdown( text );
        }

        return text;
    }

    // private
    #indexChanges ( commitTypes ) {
        this.#changesGroups = [];

        // remove disabled commit types
        commitTypes = Object.entries( commitTypes ).reduce( ( commitTypes, [ key, value ] ) => {
            if ( value ) commitTypes[ key ] = value;

            return commitTypes;
        }, {} );

        // index primary types
        const primaryTypes = new Map();

        for ( const [ type, { title, primaryChange } ] of Object.entries( commitTypes ) ) {
            if ( !primaryChange ) continue;

            primaryTypes.set( type, title || TITLES[ type ] || type.charAt( 0 ).toUpperCase() + type.slice( 1 ) );
        }

        // breaking changes
        const breakingChanges = this.#changes.getChanges( change => change.isBreakingChange );

        // breaking change is notable
        if ( breakingChanges.length ) {
            this.#hasNotableChanges = true;
        }

        this.#changesGroups.push( {
            "name": "breaking changes",
            "changes": breakingChanges,
            "report": true,
            "primaryChange": true,
            "showAnnotatiion": true,
        } );

        // primary changes
        for ( const [ type, title ] of primaryTypes.entries() ) {
            const changes = this.#changes.getChanges( change => !change.isBreakingChange && change.type === type );

            // notable change
            if ( changes.length && commitTypes[ type ].notableChange ) {
                this.#hasNotableChanges = true;
            }

            this.#changesGroups.push( {
                "name": title,
                changes,
                "report": commitTypes[ type ].notableChange,
                "primaryChange": true,
                "showAnnotatiion": true,
            } );
        }

        // secondary changes
        const secondaryChanges = this.#changes.getChanges( change => !change.isBreakingChange && !primaryTypes.has( change.type ) );

        this.#changesGroups.push( {
            "name": "Other changes",
            "changes": secondaryChanges,
            "report": true,
            "primaryChange": false,
            "showAnnotatiion": true,
        } );

        // included pre-releases
        this.#changesGroups.push( {
            "name": "Included pre-releases",
            "changes": this.#changes.getChanges( change => change.isReleaseChange ),
            "report": false,
            "primaryChange": false,
            "showAnnotatiion": false,
        } );
    }

    #createHeader ( currentRelease ) {
        if ( this.#previousRelease && currentRelease ) {
            return `**Changes between the releases: \`${ this.#previousRelease.versionString }\` (${ this.#previousRelease.changelogDate }) ... \`${ currentRelease.versionString }\` (${ currentRelease.changelogDate })**`;
        }
        else if ( !this.#previousRelease && currentRelease ) {
            return `**Changes for the release: \`${ currentRelease.versionString }\` (${ currentRelease.changelogDate })**`;
        }
        else if ( this.#previousRelease && !this.#currentRelease ) {
            return `**Changes since the release: \`${ this.#previousRelease.versionString }\` (${ this.#previousRelease.changelogDate })**`;
        }
        else {
            return `**Changes since the initial commit**`;
        }
    }
}
