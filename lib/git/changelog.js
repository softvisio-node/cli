import ejs from "#core/ejs";
import Markdown from "#core/markdown";
import { resolve } from "#core/utils";

export default class GitChangelog {
    #changes;
    #previousRelease;
    #currentRelease;
    #upstream;
    #changesGroups;

    constructor ( changes, { previousRelease, currentRelease, upstream } ) {
        this.#changes = changes;
        this.#previousRelease = previousRelease;
        this.#currentRelease = currentRelease;
        this.#upstream = this.upstream;
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
    async createChangelog ( { currentRelease, text } = {} ) {
        const changelog = await ejs.renderFile( resolve( "#resources/templates/changelog.md.ejs", import.meta.url ), {
            "changelog": this,
            "currentRelease": currentRelease || this.#currentRelease,
            "changesGroups": this.#getChangesGroups(),
            "compareUrl": !this.#previousRelease || !this.#currentRelease
                ? null
                : this.#upstream?.getCompareUrl( this.#previousRelease.versionString, this.#currentRelease.versionString ),
        } );

        if ( text ) {
            return new Markdown( changelog ).toString( { "ansi": true } ).trim();
        }
        else {
            return changelog;
        }
    }

    createChangesList ( { currentRelease } = {} ) {
        currentRelease ||= this.#currentRelease;

        const lines = [];

        if ( this.#previousRelease && currentRelease ) {
            lines.push( `### Changes between the releases: ${ this.#previousRelease.versionString }..${ currentRelease.versionString }` );
        }
        else if ( !this.#previousRelease && currentRelease ) {
            lines.push( `### Changes for the release: ${ currentRelease.versionString }` );
        }
        else if ( this.#previousRelease && !this.#currentRelease ) {
            lines.push( `### Changes since the release: ${ this.#previousRelease.versionString }` );
        }
        else {
            lines.push( `### Changes since the initial commit` );
        }

        if ( this.hasChanges ) {
            lines.push( "" );

            for ( const change of this.#changes ) {
                lines.push( `- ${ change.getChangelogSubject() }` );
            }
        }

        return lines.join( "\n" );
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

    // private
    #getChangesGroups () {
        if ( !this.#changesGroups ) {
            this.#changesGroups = {
                "Breaking changes": this.#changes.getChanges( change => change.isBreakingChange ),
                "Features": this.#changes.getChanges( change => change.isFeature && !change.isBreakingChange ),
                "Fixes": this.#changes.getChanges( change => change.isFix && !change.isBreakingChange ),
                "Other changes": this.#changes.getChanges( change => change.isOther && !change.isBreakingChange ),
                "Included releases": this.#changes.getChanges( change => change.isReleaseChange ),
            };
        }

        return this.#changesGroups;
    }
}
