# Bookmark Commands

## Export Bookmarks

Export all bookmarks for a package. The exported file can then be imported into another team using the `import bookmarks` command.

```
content-cli export bookmarks -p <profile> --packageKey <packageKey>
```

By default, the export is saved to `bookmarks-<packageKey>.json` in the current directory. Use `-f` to specify a custom output path:

```
content-cli export bookmarks -p <profile> --packageKey <packageKey> -f my-bookmarks.json
```

## Import Bookmarks

Import bookmarks into a package from a previously exported JSON file.

```
content-cli import bookmarks -p <profile> --packageKey <packageKey> -f bookmarks-<packageKey>.json
```

The import result is printed to the console showing the status of each entry (CREATED or SKIPPED).
