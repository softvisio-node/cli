# FAQ

### How to add a link to the external file to the sidebar

You need to use aliases.

`.config.yaml`:

```yaml
aliases:
    "/external-file-alias": "https://external/file.md"
```

`_sidebar.md`:

```
[External file](/external-file-alias)
```
