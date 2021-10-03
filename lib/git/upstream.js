// https://git-scm.com/docs/git-clone#_git_urls_a_id_urls_a

const ISSUE_RE = /(?<=^|\W)(?<repoId>[\w.-]+\/[\w.-]+)?#(?<issueId>\d+)(?=\W|$)/g;

export default class GitUpstream {
    repoNamespace;
    repoName;
    repoId;
    host;

    hosting; // github, bitbucket, gitlab
    sshPort;
    httpsPort;

    constructor ( url ) {
        var match = url.match( /^git@([A-Za-z0-9.-]+?):([A-Za-z0-9_-]+?)\/([A-Za-z0-9_.-]+)/ );

        // git@github.com:softvisio/phonegap.git
        if ( match ) {
            this.host = match[1];
            this.repoNamespace = match[2];
            this.repoName = match[3];
        }

        // https://github.com/softvisio/phonegap.git
        // git://github.com/softvisio/phonegap.git
        // ssh://git@github.com/softvisio/phonegap.git
        else {
            url = new URL( url );

            this.host = url.hostname;

            if ( url.port ) {
                if ( url.protocol === "https:" ) this.httpsPort = url.port;
                else if ( url.protocol === "ssh:" ) this.sshPort = url.port;
            }

            match = url.pathname.match( /([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)/ );

            if ( match ) {
                this.repoNamespace = match[1];
                this.repoName = match[2];
            }
        }

        this.repoName = this.repoName.replace( /\.git$/, "" );

        this.repoId = this.repoNamespace + "/" + this.repoName;

        if ( this.host.indexOf( "bitbucket" ) > -1 ) this.hosting = "bitbucket";
        else if ( this.host.indexOf( "github" ) > -1 ) this.hosting = "github";
        else if ( this.host.indexOf( "gitlab" ) > -1 ) this.hosting = "gitlab";
    }

    get httpsCloneUrl () {
        return this.#getBaseUrl( true ) + ".git";
    }

    get sshCloneUrl () {
        return this.#getBaseUrl( false ) + ".git";
    }

    get httpsWikiCloneUrl () {
        return this.#getWikiCloneUrl( true );
    }

    get sshWikiCloneUrl () {
        return this.#getWikiCloneUrl( false );
    }

    get homeUrl () {
        return this.#getBaseUrl( true );
    }

    get issuesUrl () {
        return this.#getIssuesUrl();
    }

    get discussionsUrl () {
        var url = this.#getBaseUrl( true );

        // github
        if ( this.hosting === "github" ) {
            return url + "/discussions";
        }

        // bitbucket
        else if ( this.hosting === "bitbucket" ) {
            return null;
        }

        // gitlab
        else {
            return null;
        }
    }

    get wikiUrl () {
        var url = this.#getBaseUrl( true );

        // github
        if ( this.hosting === "github" ) {
            url += "/wiki";
        }

        // bitbucket
        else if ( this.hosting === "bitbucket" ) {
            url += "/wiki";
        }

        // gitlab
        else {
            url += "/-/wikis";
        }

        return url;
    }

    get docsUrl () {

        // github
        if ( this.hosting === "github" ) {
            return `https://${this.repoNamespace}.github.io/${this.repoName}/`;
        }

        // bitbucket
        else if ( this.hosting === "bitbucket" ) {
            return null;
        }

        // gitlab
        else {
            return null;
        }
    }

    get rawUrl () {

        // github
        if ( this.hosting === "github" ) {
            return `https://raw.githubusercontent.com/${this.repoId}`;
        }

        // bitbucket
        else if ( this.hosting === "birbucket" ) {
            return `https://bitbucket.org/${this.repoId}/raw`;
        }

        // gitlab
        else {
            return `${this.#getBaseUrl( true )}/-/raw`;
        }
    }

    // public
    getChangelogUrl ( branch ) {
        branch ||= "master";

        return this.rawUrl + "/" + branch + "/CHANGELOG.md";
    }

    getCommitUrl ( hash ) {

        // github
        if ( this.hosting === "github" ) {
            return `${this.#getBaseUrl( true )}/commit/${hash}`;
        }

        // bitbucket
        else if ( this.hosting === "birbucket" ) {
            return `${this.#getBaseUrl( true )}/commit/${hash}`;
        }

        // gitlab
        else {
            return `${this.#getBaseUrl( true )}/-/commit/${hash}`;
        }
    }

    getIssueUrl ( id, repoId ) {
        return this.#getIssuesUrl( repoId ) + "/" + id;
    }

    linkifyMessage ( message ) {

        // linkify issues
        return message.replaceAll( ISSUE_RE, ( match, repoId, issueId ) => {
            var link;

            if ( !repoId || repoId === this.repoId ) {
                link = `[#${issueId}](${this.getIssueUrl( issueId )})`;
            }
            else {
                link = `[${repoId}#${issueId}](${this.getIssueUrl( issueId, repoId )})`;
            }

            return link;
        } );
    }

    // private
    #getBaseUrl ( https, repoId ) {
        var url = https ? "https://" : "ssh://git@";

        url += this.host;

        if ( https ) {
            if ( this.httpsPort ) url += ":" + this.httpsPort;
        }
        else {
            if ( this.sshPort ) url += ":" + this.sshPort;
        }

        url += "/" + ( repoId || this.repoId );

        return url;
    }

    #getWikiCloneUrl ( https ) {
        const url = this.#getBaseUrl( https );

        // bitbucket
        if ( this.hosting === "bitbucket" ) {
            return url + ".git/wiki";
        }

        // github, gitlab
        else {
            return url + ".wiki.git";
        }
    }

    #getIssuesUrl ( repoId ) {
        var url = this.#getBaseUrl( true, repoId );

        // github
        if ( this.hosting === "github" ) {
            return url + "/issues";
        }

        // bitbucket
        else if ( this.hosting === "bitbucket" ) {
            return url + "/issues";
        }

        // gitlab
        else {
            return url + "/-/issues";
        }
    }
}
