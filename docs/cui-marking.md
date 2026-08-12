# CUI marking

When Content CLI writes a user-facing file or directory to disk, it asks the team’s CUI settings whether marking applies. The answer decides the filename (or directory name) and whether a cover sheet is included.

Commands that only print to the console, profile and log files, and exports that go straight to a Git branch never mark anything on disk.

## Classification: cover response → artifact

Example: `list packages --json` would otherwise write `packages.json`.

| Cover response | Meaning | Outcome |
|---|---|---|
| **403** | Feature flag disabled | `packages.json` |
| **204** | Unclassified | `Unclassified - packages.json` |
| **200** | Classified | `CUI - packages.zip` containing `packages.json` and `CUI_Cover_Sheet.pdf` |
| Any other response | Fail closed | Nothing written; the command errors |

The status code alone decides the outcome. Any failure of the cover call, including an unexpected status or a **200** without a usable cover page, aborts the command and leaves no output behind.

## Scope: how the write is triggered

| Trigger | Commands | Example (unclassified) | Example (classified) |
|---|---|---|---|
| `--json` listings and reports | `list spaces`, `list packages`, `list assets` / `assignments` / `data-pools`, `config *`, `t2tc package list` / `diff`, `deployment *`, `asset-registry *` | `list packages --json` → `Unclassified - packages.json` | `list packages --json` → `CUI - packages.zip` containing `packages.json` and `CUI_Cover_Sheet.pdf` |
| `-o, --outputToJsonFile` reports | `analyze` / `import action-flows`, `export data-pool`, `import data-pools`, `t2tc package import` report | `export data-pool -o` → `Unclassified - <report>.json` | `export data-pool -o` → `CUI - <report>.zip` containing the JSON and `CUI_Cover_Sheet.pdf` |
| Artifact is already an archive | `config package export --zip`, `config branch export --zip`, `t2tc package export`, `export action-flows`, `pull package` | `config package export --zip` → `Unclassified - my-package.zip` | `config package export --zip` → `CUI - my-package.zip` with `CUI_Cover_Sheet.pdf` inside the archive |
| Single non-archive export | `pull asset` / `skill` / `data-pool` / `view-bookmarks` / `bookmarks`, `export bookmarks` | `pull asset` → `Unclassified - asset_<key>.yml` | `pull asset` → `CUI - asset_<key>.zip` containing the YAML and `CUI_Cover_Sheet.pdf` |
| Output is a directory | `config package export`, `config branch export`, `t2tc package export --unzip` | `config package export` → `Unclassified - my-package/` | `config package export` → `CUI - my-package/` with `CUI_Cover_Sheet.pdf` inside |
| `--gitBranch` variants | `config package export`, `config branch export`, `t2tc package export` | Out of scope | Out of scope |
| No output flag | Console-only listings, profile / git-profile / log files | Out of scope | Out of scope |
