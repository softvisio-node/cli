// https://git-scm.com/docs/git-clone#_git_urls_a_id_urls_a

export default class GitUpstream {
    repoNamespace;
    repoName;
    repoId;
    host;

    hosting; // bitbucket, github, gitlab
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

    _getBaseUrl ( https ) {
        var url = https ? "https://" : "ssh://git@";

        url += this.host;

        if ( https ) {
            if ( this.httpsPort ) url += ":" + this.httpsPort;
        }
        else {
            if ( this.sshPort ) url += ":" + this.sshPort;
        }

        url += "/" + this.repoId;

        return url;
    }

    getCloneUrl ( https ) {
        return this._getBaseUrl( https ) + ".git";
    }

    getWikiCloneUrl ( https ) {
        const url = this._getBaseUrl( https );

        // bitbucket
        if ( this.hosting === "bitbucket" ) {
            return url + ".git/wiki";
        }

        // github, gitlab
        else {
            return url + ".wiki.git";
        }
    }

    getHomeUrl () {
        return this._getBaseUrl( true );
    }

    getIssuesUrl () {
        var url = this._getBaseUrl( true );

        // bitbucket
        if ( this.hosting === "bitbucket" ) {
            return url + "/issues?status=new&status=open";
        }

        // github
        else if ( this.hosting === "github" ) {
            return url + "/issues";
        }

        // gitlab
        else {
            return url + "/-/issues";
        }
    }

    getWikiUrl () {
        var url = this._getBaseUrl( true );

        // bitbucket
        if ( this.hosting === "bitbucket" ) {
            url += "/wiki";
        }

        // github
        else if ( this.hosting === "github" ) {
            url += "/wiki";
        }

        // gitlab
        else {
            url += "/-/wikis";
        }

        return url;
    }
}
