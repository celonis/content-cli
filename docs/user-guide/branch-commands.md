# Branch Commands (beta)

The `config branch` command group lets you author and merge branches from the CLI, and optionally mirror a branch to a Git branch one-to-one. The related [`config pointer`](#select-a-branch-as-live-config-pointer) group selects which branch a package's consumers read.

## Concepts

- **Main package** — a regular package, identified by its plain `<packageKey>` (no `@`).
- **Branch** — a separate package keyed `<packageKey>@<branchKey>`, created from a version of the source package. The source can be the main package or another branch.
- **Git mirror** — an optional, one-to-one mapping between a branch and a Git branch in a configured Git profile. The mirror is opt-in: it is engaged only when you pass `--gitProfile` to `config branch export` / `config branch import`. Without a Git profile these commands read and write local files instead, exactly like `config package export` / `config package import`.

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

`--sourceVersion` must be an existing version of the source package. Unlike `merge preview` and `merge apply`, `create` does not accept `LATEST`; use `config versions get --packageKey <packageKey> --packageVersion LATEST` to resolve the newest version first.

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

`merge apply` always needs a merge source: either pass `--sourceKey` together with `--sourceVersion`, or point `-f` at a file that carries both. Passing neither, or `--sourceKey` on its own, is rejected.

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

- `--bump PATCH` — bump the patch segment. This is also the default when neither `--bump` nor `--newVersion` is given, so you rarely need it. Minor and major bumps are not supported; pin the version with `--newVersion` instead.
- `--newVersion 1.5.0` — pin an explicit semver.
- `--summary "<text>"` — summary of changes (default `"Merge <sourceKey>@<sourceVersion>"`).

### With a resolutions file

Build a `MergeBranchTransport` resolution file from the preview (one entry per node where a custom resolution is needed), then apply:

```bash
content-cli config branch merge apply \
  --packageKey <targetPackageKey> \
  --file merge-request.json
```

- `--sourceKey` / `--sourceVersion` override the file's values when you want to keep one resolution file but target different sources.
- `--bump` / `--newVersion` / `--summary` override the file's `versionCreate` block when set.

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

1. `--newVersion <semver>` flag or `--bump PATCH` flag (and `--summary`).
2. Whatever the resolutions file already has under `versionCreate`.
3. Default: `versionBumpOption: PATCH` + `summaryOfChanges: "Merge <sourceKey>@<sourceVersion>"`.

`resolution` per node accepts `ACCEPT_SOURCE`, `ACCEPT_TARGET`, or `CUSTOM`. `CUSTOM` requires the matching `customConfigurationChanges` / `customMetadataChanges` JSON-Patch ops.

> **Custom changes are restricted to paths the preview already touched.** Each op in `customConfigurationChanges` / `customMetadataChanges` must reference a `path` that appears in either the preview's `sourceChanges` or `targetChanges` for that node — you cannot introduce edits at paths neither side modified. The server rejects ops at unrelated paths.

Worked example: the preview reports that for node `node-1`, the source set `/title` to `"Source title"` and the target set `/title` to `"Target title"` (a conflict at `/title`). A valid CUSTOM resolution picks either the source's or the target's value for `/title` — not a third one — and it cannot also touch `/description` (which neither side changed):

```json
{
  "nodeKey": "node-1",
  "resolution": "CUSTOM",
  "customConfigurationChanges": [
    { "op": "replace", "path": "/title", "value": "Source title" }
  ]
}
```

## Select a branch as LIVE (`config pointer`)

The `config pointer` group decides which branch of a package its consumers read. Selecting a branch as
LIVE is how you release a branch without merging it back into main.

This group needs the `pacman.live-branch-pointer` feature to be active for the team.

### Concepts

- **LIVE selection** — a named pointer on a main package. While it is set, a consumer that references
  the main package resolves to the selected branch instead. Consumers keep referencing the plain
  `<packageKey>`, so moving the selection to a new branch needs no change on their side.
- **No selection** — the default. Consumers read the main package.

Both commands take `--packageKey` as the **main** package key. Passing a `<packageKey>@<branchKey>`
value is rejected before any request is sent; name the branch with `--branchKey` instead.

### Set the LIVE selection

```bash
content-cli config pointer set --packageKey <packageKey> --branchKey <branchKey>
```

`--json` writes the raw `PackagePointerTransport` payload to a file in the working directory.

There is no dry-run flag. `set` always changes the selection when it succeeds, so validate the branch
first with `config package validate --packageKey <packageKey>@<branchKey>`.

`main` cannot be selected. To return consumers to the main package, merge the branch into main with
[`config branch merge apply`](#preview-and-apply-merges) — there is no CLI command that clears a
selection, because leaving consumers pointed at nothing is not a state the CLI will produce.

### Read the LIVE selection

```bash
content-cli config pointer get --packageKey <packageKey>
content-cli config pointer get --packageKey <packageKey> --json
```

When no branch is selected, the command reports that and exits successfully. With `--json` it writes
`null`.

### Responses worth recognizing

| Response | Meaning | What to do |
|---|---|---|
| `409` with `package-pointer-blocking-problems` | The branch has problems that block a release. | Run `config package validate --packageKey <packageKey>@<branchKey>`, fix what it reports, then set the selection again. There is no override flag. |
| `403` | Ambiguous. Either the profile may not edit the package, **or** `pacman.live-branch-pointer` is inactive for the team. The response body is empty and does not distinguish the two. | Confirm the feature is active before asking for permissions. |
| `400` | `--packageKey` was not a main key, or the composed branch key does not name a branch. | Check both keys. `config branch list --packageKey <packageKey>` shows the valid branch keys. |

### Where this sits in a release

```bash
content-cli config package validate --packageKey my-package
content-cli config versions create --packageKey my-package --versionBumpOption PATCH
content-cli config branch create --packageKey my-package --branchKey release-branch --sourceVersion 1.4.0
content-cli config package validate --packageKey my-package@release-branch
content-cli config pointer set --packageKey my-package --branchKey release-branch
```

Run the branch's pipelines and transformations, and refresh any cached perspectives, before the last
step. The problems those steps clear are the same ones the `409` reports.

## Branch export / import

`config branch export` and `config branch import` move a branch's contents in and out of the package. They behave like `config package export` / `config package import`, with one difference: they always rewrite `package.json#key`, so a branch's exported content lines up with the main package's.

### Key rewriting

A branch package's key is `<mainPackageKey>@<branchKey>`. So that a main-vs-branch pull request diffs real content instead of key suffixes, `config branch export` rewrites that branch key down to the main package key before writing:

- `package.json` → `key`

Node files are **not** rewritten. The server omits `packageNodeKey` / `parentNodeKey` from the export whenever they equal the package key, so there is nothing to strip. `config branch import` applies the exact reverse on the way back in, restoring the `@<branchKey>` suffix in `package.json#key` so the package re-imports under its own branch identity.

### Local vs Git

Both commands work locally by default and only touch Git when you pass `--gitProfile`:

| Mode | Trigger | Behaviour |
|---|---|---|
| Local | no `--gitProfile` | `export` writes a `<packageKey>` directory (or `<packageKey>.zip` with `--zip`); `import` reads `--file` / `--directory` |
| Git | `--gitProfile <name>` | `export` pushes to the Git branch named `<branchKey>`; `import` pulls that Git branch. With `--all`, the main package goes to the Git branch `main` |

A configured default Git profile is **not** enough to trigger Git mode — you must pass `--gitProfile` explicitly on the command. See [Using Git Profiles in Getting Started](../getting-started.md#using-git-profiles) for how to create, list, and authenticate a Git profile.

### Export a branch

```bash
# Local: writes a ./my-package directory with package.json#key rewritten to "my-package"
content-cli config branch export \
  --packageKey my-package \
  --branchKey feature-a

# Git: pushes the rewritten package to the Git branch "feature-a"
content-cli config branch export \
  --packageKey my-package \
  --branchKey feature-a \
  --gitProfile <gitProfileName>
```

Options:

- `--zip` — write a single `<packageKey>.zip` instead of an unzipped directory (local export only).
- `--all` — push the main package and every one of its branches to Git in one go. Requires `--gitProfile` and is mutually exclusive with `--branchKey`. The main package goes to the Git branch `main`; each branch goes to a Git branch named after its branch key.
- `--json` — write the summary to a JSON file instead of logging it.

### Import a branch

```bash
# Local: reads ./feature-a-dir and imports it as my-package@feature-a
content-cli config branch import \
  --packageKey my-package \
  --branchKey feature-a \
  --directory ./feature-a-dir

# Git: pulls the Git branch "feature-a" and imports it as my-package@feature-a
content-cli config branch import \
  --packageKey my-package \
  --branchKey feature-a \
  --gitProfile <gitProfileName>
```

Options:

- `-f, --file <file>` / `-d, --directory <directory>` — local import source (mutually exclusive with each other and with `--gitProfile`).
- `--overwrite` — allow overwriting an existing package with the same key.
- `--json` — write the summary to a JSON file instead of logging it.
