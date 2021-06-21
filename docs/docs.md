# Docs

Project documentation site generator.

## Config `.docs.config.yaml`

Config should be located in `/.docs.config.yaml` or `/docs/.docs.config.yaml`. Documentation will be generated relative to the config location.

### aliases

-   type: <Object\>
-   default: `null`

Set of routes aliases in `alias`: `url` form. `alias` can be string or regular expression. For more detaild pls refer to the [docsify documentation](https://docsify.js.org/#/configuration?id=alias).

Example:

```yaml
aliases:
    info: http://example.com/info.md
```

Use alias from markdown:

```markdown
[link text](/alias)
```

Use alias from html:

```html
<a href="#alias">link text</a>
```

### api

-   type: <string[]\>
-   default: `null`

Array of API schemas location (relative to the project root directory). Documentation for enumerated schemas will be generated during docs build process.

Example:

```yaml
api: [lib/api]
```

### changelog

-   type: <boolean\> | <string\>
-   default: `true`

Enable changelog integration. Possible values:

-   `false`: Disable changelog.
-   `true`: Use `CHANGELOG.md` in `main` branch.
-   <string\>: Changelog URL, relative URL resovled using your repo user content URL as base.

If changelog is enabled `/changelog` alias created automatically.

### favicon

-   type: <string\>
-   default: `null`

Set site favicon url. If not set but `logo` option is defined - your logo will be used as favicon.

### generateReadme

-   type: <boolean\>
-   default: `true`

Generate root `README.md` from docs `README.md`.

### logo

-   type: <boolean\> | <string\> | <Object\>
-   default: `false`

Set site logo. Possible values:

-   `false`: Logo is not used.
-   `true`: Logo URL `assets/logo.png`, height `50px`.
-   <string\>: Logo URL. Height will be set to `50px`.
-   <Object\>: Logo configuration object:
    -   `href` <string\> Logo URL.
    -   `width?` <intege\> Logo width. **Default**: `null`.
    -   `height?` <integer\> Logo height. **Default**: `50px`.

### name

-   type: <string\>
-   default: `name` field from the project `package.json`

Project name. Default value is `name` field value from the `package.json`.

### rpc

-   type: <string[]\>
-   default: `null`

Array of RPC schemas location (relative to the project root directory). Documentation for enumerated schemas will be generated during docs build process.

Example:

```yaml
rpc: [lib/rpc]
```

### siteURL

-   type: <string\>
-   default: your `git` upstream hosting pages url (if available)

Documentation site URL. Default value is your repository upstream pages url.

### subMaxLevel

-   type: <integer\>
-   default: 2

Maximum headings level to display in the sidebar. Refer to the [docsify documentation](https://docsify.js.org/#/configuration?id=submaxlevel) for more details.

## FAQ

### How to add a link to the external file to the sidebar

You need to use aliases.

`.config.yaml`:

```yaml
aliases:
    "/external-file-alias": "https://external/file.md"
```

`_sidebar.md`:

```markdown
[External file](/external-file-alias)
```
