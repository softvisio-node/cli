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

    get httpsCloneURL () {
        return this.#getBaseURL( true ) + ".git";
    }

    get sshCloneURL () {
        return this.#getBaseURL( false ) + ".git";
    }

    get httpsWikiCloneURL () {
        return this.#getWikiCloneURL( true );
    }

    get sshWikiCloneURL () {
        return this.#getWikiCloneURL( false );
    }

    get homeURL () {
        return this.#getBaseURL( true );
    }

    get issuesURL () {
        return this.#getIssuesURL();
    }

    get discussionsURL () {
        var url = this.#getBaseURL( true );

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

    get wikiURL () {
        var url = this.#getBaseURL( true );

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

    get docsURL () {

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

    get rawURL () {

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
            return `${this.#getBaseURL( true )}/-/raw`;
        }
    }

    // public
    getChangelogURL ( branch ) {
        branch ||= "master";

        return this.rawURL + "/" + branch + "/CHANGELOG.md";
    }

    getCommitURL ( hash ) {

        // github
        if ( this.hosting === "github" ) {
            return `${this.#getBaseURL( true )}/commit/${hash}`;
        }

        // bitbucket
        else if ( this.hosting === "birbucket" ) {
            return `${this.#getBaseURL( true )}/commit/${hash}`;
        }

        // gitlab
        else {
            return `${this.#getBaseURL( true )}/-/commit/${hash}`;
        }
    }

    getIssueURL ( id, repoId ) {
        return this.#getIssuesURL( repoId ) + "/" + id;
    }

    linkifyMessage ( message ) {

        // linkify issues
        return message.replaceAll( ISSUE_RE, ( match, repoId, issueId ) => {
            var link;

            if ( !repoId || repoId === this.repoId ) {
                link = `[#${issueId}](${this.getIssueURL( issueId )})`;
            }
            else {
                link = `[${repoId}#${issueId}](${this.getIssueURL( issueId, repoId )})`;
            }

            return link;
        } );
    }

    // private
    #getBaseURL ( https, repoId ) {
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

    #getWikiCloneURL ( https ) {
        const url = this.#getBaseURL( https );

        // bitbucket
        if ( this.hosting === "bitbucket" ) {
            return url + ".git/wiki";
        }

        // github, gitlab
        else {
            return url + ".wiki.git";
        }
    }

    #getIssuesURL ( repoId ) {
        var url = this.#getBaseURL( true, repoId );

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
