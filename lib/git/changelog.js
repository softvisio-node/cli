import ejs from "#core/ejs";
import Markdown from "#core/markdown";
import { resolve } from "#core/utils";

export default class GitChangelog {
    #changes;
    #previousRelease;
    #currentRelease;
    #upstream;
    #changesGroups;

    constructor ( changes, { upstream, previousRelease, currentRelease } ) {
        this.#changes = changes;
        this.#upstream = upstream;
        this.#previousRelease = previousRelease;
        this.#currentRelease = currentRelease;
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

    get hasBreakingChanges () {
        return this.#changes.hasBreakingChanges;
    }

    get hasFeatureChanges () {
        return this.#changes.hasFeatureChanges;
    }

    get hasFixChanges () {
        return this.#changes.hasFixChanges;
    }

    get hasOtherChanges () {
        return this.#changes.hasOtherChanges;
    }

    // public
    async createChangelog ( { currentRelease, text, ansi = true } = {} ) {
        currentRelease ||= this.#currentRelease;

        const changelog = await ejs.renderFile( resolve( "#resources/templates/changelog.md.ejs", import.meta.url ), {
            "changelog": this,
            currentRelease,
            "changesGroups": this.#getChangesGroups(),
            "compareUrl": !this.#previousRelease || !currentRelease
                ? null
                : this.#upstream?.getCompareUrl( this.#previousRelease.versionString, currentRelease.versionString ),
        } );

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
            for ( const [ name, { changes } ] of Object.entries( this.#getChangesGroups() ) ) {
                if ( !changes.length ) continue;

                lines.push( "" );
                lines.push( `**${ name }:**` );

                for ( const change of changes ) {
                    lines.push( `- ${ change.getChangelogSubject() }` );
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
        const report = `
Total changes:    ${ this.#changes.size || "-" }
Breaking changes: ${ this.#changes.breakingChanges || "-" }
Features:         ${ this.#changes.featureChanges || "-" }
Fixes:            ${ this.#changes.fixChanges || "-" }
Other:            ${ this.#changes.otherChanges || "-" }
`.trim();

        return report;
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

    #getChangesGroups () {
        if ( !this.#changesGroups ) {
            this.#changesGroups = {
                "Breaking changes": {
                    "changes": this.#changes.getChanges( change => change.isBreakingChange ),
                    "showAnnotatiion": true,
                },
                "Features": {
                    "changes": this.#changes.getChanges( change => !change.isBreakingChange && change.isFeature ),
                    "showAnnotatiion": true,
                },
                "Fixes": {
                    "changes": this.#changes.getChanges( change => !change.isBreakingChange && change.isFix ),
                    "showAnnotatiion": true,
                },
                "Other changes": {
                    "changes": this.#changes.getChanges( change => !change.isBreakingChange && change.isOther && !change.isReleaseChange ),
                    "showAnnotatiion": true,
                },
                "Included pre-releases": {
                    "changes": this.#changes.getChanges( change => change.isReleaseChange ),
                    "showAnnotatiion": false,
                },
            };
        }

        return this.#changesGroups;
    }
}
