# Branch Commands (beta)

The `config branch` command group lets you author and merge branches from the CLI.

## Concepts

- **Main package** — a regular package, identified by its plain `<packageKey>` (no `@`).
- **Branch** — a separate package keyed `<packageKey>@<branchKey>`, created from a version of the source package. The source can be the main package or another branch.

## Branching Settings

Configure branching settings on a main package. Currently the only option is whether branching is enabled.

```bash
content-cli config branch settings set --packageKey <packageKey> --enabled true
content-cli config branch settings set --packageKey <packageKey> --enabled false
```

The `--packageKey` must be the main package key, not a `<packageKey>@<branchKey>` value.

## Create a Branch

```bash
content-cli config branch create \
  --packageKey <packageKey> \
  --branchKey <branchKey> \
  --sourceVersion 1.4.0
```

`--validate` runs the server-side validator without persisting and prints a success message instead of the created branch.

## List Branches

```bash
content-cli config branch list --packageKey <packageKey>
content-cli config branch list --packageKey <packageKey> --json
```

`--json` writes the raw `BranchTransport[]` payload to a file in the working directory.

Each entry includes `sourcePackageKey` and `sourceVersion`, which together form the join key back to the version the branch was cut from. Multiple branches may share the same source.

## Delete a Branch

```bash
content-cli config branch delete \
  --packageKey <packageKey> \
  --branchKey  <branchKey>
```

- `--packageKey` must be the main package key (no `@`).
- `--branchKey` is the branch to delete.

## Preview and Apply Merges

You can inspect the changes a merge would apply with `merge preview`, then apply them with `merge apply`.

```bash
content-cli config branch merge preview \
  --packageKey <targetPackageKey> \
  --sourceKey   <sourcePackageKey> \
  --sourceVersion 1.4.0 \
  --json
```

`sourcePackageKey` is typically `<packageKey>@<branchKey>`. `<sourceVersion>` may be a version or `LATEST`.

The JSON preview contains the conflict layout (`changes.configuration.conflicts`, `changes.metadata.conflicts`) and auto-merge results.

### Quick merge

When you do not need to override any node-level resolutions, the resolutions file is optional:

```bash
content-cli config branch merge apply \
  --packageKey   <targetPackageKey> \
  --sourceKey    <sourcePackageKey> \
  --sourceVersion 1.4.0
```

The CLI posts the merge directly. If the server detects conflicts it returns an error — at that point run `config branch merge preview` to inspect them and re-run `apply` with `-f <resolutions.json>`.

Customise the published version without writing a file:

- `--bump PATCH|MINOR|MAJOR` — pick the bump option (default `PATCH`).
- `--version 1.5.0` — pin an explicit semver.
- `--summary "<text>"` — summary of changes (default `"Merge <sourceKey>@<sourceVersion>"`).

### With a resolutions file

Build a `MergeBranchTransport` resolution file from the preview (one entry per node where a custom resolution is needed), then apply:

```bash
content-cli config branch merge apply \
  --packageKey <targetPackageKey> \
  --file merge-request.json
```

- `--sourceKey` / `--sourceVersion` override the file's values when you want to keep one resolution file but target different sources.
- `--bump` / `--version` / `--summary` override the file's `versionCreate` block when set.

A valid merge body looks like:

```json
{
  "sourceKey": "my-pkg@feature-a",
  "sourceVersion": "1.4.0",
  "resolvedPackageConflict": null,
  "resolvedNodeConflicts": [
    { "nodeKey": "node-1", "resolution": "ACCEPT_SOURCE" }
  ],
  "versionCreate": {
    "versionBumpOption": "PATCH",
    "summaryOfChanges": "Merge feature-a into main"
  }
}
```

`versionCreate` is filled in this order of precedence (highest wins):

1. `--version <semver>` flag or `--bump PATCH|MINOR|MAJOR` flag (and `--summary`).
2. Whatever the resolutions file already has under `versionCreate`.
3. Default: `versionBumpOption: PATCH` + `summaryOfChanges: "Merge <sourceKey>@<sourceVersion>"`.

`resolution` per node accepts `ACCEPT_SOURCE`, `ACCEPT_TARGET`, or `CUSTOM`. `CUSTOM` requires the matching `customConfigurationChanges` / `customMetadataChanges` JSON-Patch ops.

> **Custom changes are restricted to paths the preview already touched.** Each op in `customConfigurationChanges` / `customMetadataChanges` must reference a `path` that appears in either the preview's `sourceChanges` or `targetChanges` for that node — you cannot introduce edits at paths neither side modified. The server rejects ops at unrelated paths.

Worked example: the preview reports that for node `node-1`, the source set `/title` to `"Source title"` and the target set `/title` to `"Target title"` (a conflict at `/title`). A valid CUSTOM resolution can pick a third value for `/title`, but it cannot also touch `/description` (which neither side changed):

```json
{
  "nodeKey": "node-1",
  "resolution": "CUSTOM",
  "customConfigurationChanges": [
    { "op": "replace", "path": "/title", "value": "Negotiated title" }
  ]
}
```
