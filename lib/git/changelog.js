import ejs from "#core/ejs";
import Markdown from "#core/markdown";
import { resolve } from "#core/utils";

export default class GitChangelog {
    #changes;
    #previousRelease;
    #currentRelease;
    #upstream;

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
    async createChangeLog ( { markdown } = {} ) {
        const changelog = await ejs.renderFile( resolve( "#resources/templates/changelog.md.ejs", import.meta.url ), {
            "changelog": this,
            "compareUrl": !this.#previousRelease || !this.#currentRelease
                ? null
                : this.#upstream?.getCompareUrl( this.#previousRelease.versionString, this.#currentRelease.versionString ),
            "blocks": {
                "Breaking changes": "breakingChanges",
                "Features": "featureNonBreakingChanges",
                "Fixes": "fixNonBreakingChanges",
                "Other changes": "otherNonBreakingChanges",
            },
        } );

        if ( markdown ) {
            return new Markdown( changelog ).toString( { "ansi": true } ).trim();
        }
        else {
            return changelog;
        }
    }

    createChangesList () {
        const lines = [];

        if ( this.#previousRelease && this.#currentRelease ) {
            lines.push( `### Changes between the releases: ${ this.#previousRelease.versionString }..${ this.#currentRelease.versionString }` );
        }
        else if ( !this.#previousRelease && this.#currentRelease ) {
            lines.push( `### Changes for the release: ${ this.#currentRelease.versionString }` );
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
Breaking changes: ${ this.#changes.breakingChanges.length || "-" }
Features:         ${ this.#changes.featureChanges.length || "-" }
Fixes:            ${ this.#changes.fixChanges.length || "-" }
Other:            ${ this.#changes.otherChanges.length || "-" }
`.trim();

        return report;
    }
}
