# Options

## name

Project name. Default value is `name` field value from the `package.json`.

## siteURL

Documentation site URL. Default value is your repository upstream pages url.

## generateReadme

Generate root `README.md`.

## changelog

Enable changelog integration. Possible values:

-   `true` - use `CHANGELOG.md` in `main` branch;
-   `string` - changelog URL, relative URL resovled using your repo user content URL as base;

If changelog is enabled you can use `#changelog` link to display changelog.

# FAQ

## How to add a link to the external file to the sidebar

You need to use aliases.

`.config.yaml`

```yaml
aliases:
    "/external-file-alias": "https://external/file.md"
```

`_sidebar.md`

```
[External file](/external-file-alias)
```
