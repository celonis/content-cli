# Team-to-Team Copy (T2TC) Commands

The `t2tc package` command group moves whole packages — and, optionally, their dependencies and variables — between teams and realms. These commands power the **Team-to-Team Copy** feature: the T2TC backend drives the copy by exporting from a source team and importing into a target team through this CLI.

These commands are a **self-contained, batch-specific set**. `t2tc package export` produces a multi-package **batch archive**, and only the other `t2tc package` commands (`import`, `diff`) understand that archive. It is **not** interchangeable with the package format used by [`config package import`](./config-commands.md#package-commands-config-package) (see [Batch archive vs. package format](#batch-archive-vs-package-format)).

> **Migrating from `config`?** `t2tc package list/export/import/diff` replace the deprecated `config list/export/import/diff` commands. The flags and behaviour are identical — only the command path changed.

| Old (deprecated) | New |
|---|---|
| `config list` | `t2tc package list` |
| `config export` | `t2tc package export` |
| `config import` | `t2tc package import` |
| `config diff` | `t2tc package diff` |

## Permissions

`t2tc package` commands run against the Pacman API and are subject to the same permission checks the platform applies in the UI. The required permission depends on the **flavor** of the target package:

| Package flavor | Required permission |
|---|---|
| **Studio** (Studio packages and their assets) | **Edit package** permission on the package |
| **OCDM** (OCDM packages and their assets) | **Edit** (admin) permission on the **data pool** the OCDM package is connected to |

`t2tc package list` is the one exception: instead of failing, it **filters out packages the profile does not have permission to access**. If a package you expect to see is missing from the list, the most likely cause is missing edit permission on the package (Studio) or on its connected data pool (OCDM).

## Batch archive vs. package format

`t2tc package export` produces a multi-package **batch archive** — a top-level `manifest.json`, `variables.json`, `studio.json`, and one nested `<packageKey>_<version>.zip` per package — that is produced and consumed **only** by the `t2tc package` commands. [`config package import`](./config-commands.md#package-commands-config-package), by contrast, works with a plain **package zip** (a `package.json`, an optional `variables.json`, and a `nodes/` folder). The two formats are **not interchangeable**:

- An archive from `t2tc package export` can be imported with `t2tc package import` or inspected with `t2tc package diff` — but **not** with `config package import`.
- A package zip used by `config package import` **cannot** be imported with `t2tc package import` or diffed with `t2tc package diff`.

Reach for `t2tc package` only for its specific bulk use-case — moving a set of packages together (for example, a migration between teams). To work with a single package, use [`config package import`](./config-commands.md#package-commands-config-package) or [`config package export`](./config-commands.md#export-a-package).

## List Packages

Packages can be listed using the following command:

```bash
content-cli t2tc package list -p <sourceProfile>
```

The result will be printed in the console containing only the package name and key:

```bash
info:    Package1 - Key: "package-1"
```

By using the `--json` option, packages can be exported (saved) in an extended form as a json file in the current working directory.

```bash
content-cli t2tc package list -p <sourceProfile> --json
```

The name of the file will be printed in the console with the following format:

```bash
info:    File downloaded successfully. New filename: 9560f81f-f746-4117-83ee-dd1f614ad624.json
```

By using the `--flavors` option, you can filter which packages to list. The available flavors are: **STUDIO** and **OCDM**.

To list staging packages instead of deployed packages use the `--staging` option. Please note that this flag is not compatible with the below options.

> For day-to-day staging listing outside the copy workflow, prefer [`config package list`](./config-commands.md#list-packages-config-package-list), which lists staging packages by default.

### List Packages with Dependencies

When using the listing command with the `--json` option, two additional options are available:

- **--withDependencies**: This option will include the dependencies of the packages in the output.

```bash
content-cli t2tc package list -p <sourceProfile> --withDependencies
```

- **--packageKeys**: This option allows you to filter the packages by their keys. You can specify multiple package keys separated by spaces.

```bash
content-cli t2tc package list -p <sourceProfile> --packageKeys key1 ... keyN
[optional] --withDependencies
```

## Export Packages

Packages can be exported using the following command:

```bash
content-cli t2tc package export -p <sourceProfile> --packageKeys key1 ... keyN
```

The `--keysByVersion` option can be used to export packages by specific version. You can specify multiple packages with version separated by spaces, in the format of 'packageKey.version'.
The `--withDependencies` option can be used to also export dependencies of the given packages.
The `--unzip` option can be used to unzip the exported packages into the current working directory.

Depending on the `--unzip` option used, a zip file, or a directory containing the exported packages, will be created in the current working directory containing:

```bash
exported_package_random_uuid/
├─ manifest.json
├─ variable.json
├─ studio.json
├─ package_key1-version.zip
├─ ...
├─ package_keyN-version.zip
```

### Git Integration for Export

The following **Git options** are available:

- `--gitProfile <gitProfileName>` – specifies the Git profile to use for exporting directly to a repository.
  If not specified, the default profile will be used.
- `--gitBranch <branchName>` – specifies the branch in the Github repository where the export will be pushed.

Example exporting to Git:

```bash
content-cli t2tc package export -p <sourceProfile> --packageKeys key1 key2 --gitProfile myGitProfile --gitBranch feature-branch
```

### Export Directory Structure

- manifest.json - File which contains the metadata of the exported packages.
- studio.json - File which contains the metadata of the exported packages in a format compatible with Studio.
- variables.json - File which contains the variables of the exported packages.
- exported packages directories - Directories containing the exported package files, each directory is named after the package key and the version.

Inside each exported package directory, the following files will be present:

- package.json - File which contains the configuration of the exported package.
- nodes/ - Directory containing the nodes of the exported package.

Inside the nodes directory, a file for each node will be present:

- node_key.json - File which contains the configuration of the exported node.

## Import Packages

Packages can be imported using the following commands, if importing from a zip file:

```bash
content-cli t2tc package import -p <sourceProfile> -f <relative exported zip file path>
```

Where `-f` is the short hand operation for `--file`.
If importing from a directory containing the exported packages, the following command can be used:

```bash
content-cli t2tc package import -p <sourceProfile> -d <relative exported directory file path>
```

Where `-d` is the shorthand operation for `--directory`.
When packages with the same keys exist in the target team, the `--overwrite` option can be used for allowing overwriting of those packages. If the package in target environment contains unpublished changes, they are automatically saved under a new version. This allows you to audit, compare, or roll back to your previous state via the version history if needed.

```bash
content-cli t2tc package import -p <sourceProfile> -f <file path> --overwrite
```

### Git Integration for Import

The following **Git options** are available:

- `--gitProfile <gitProfileName>` – specifies the Git profile to use for importing directly from a repository.
  If not specified, the default profile will be used.
- `--gitBranch <branchName>` – specifies the branch in the Github repository from which to import.

Example importing from Git:

```bash
content-cli t2tc package import -p <sourceProfile> --gitProfile myGitProfile --gitBranch feature-branch
```

Finally, the result of this command will be a list of PostPackageImportData exported as a json file. The file name will be printed with the following message format:

```bash
info:    Config import report file: 9560f81f-f746-4117-83ee-dd1f614ad624.json
```

### Validate During Import

Add `--validate` to `t2tc package import` to run validation against each node **before** the import is committed:

```bash
content-cli t2tc package import -p <sourceProfile> -d <export_dir> --validate --overwrite
```

`t2tc package import --validate` runs the **SCHEMA** layer only. It does **not** run BUSINESS-layer checks (PQL parsing, data-model availability, KPI uniqueness, etc.) or PACKAGE_SETTINGS checks (package dependencies, variables, and flavor-specific package settings). To run those validations, use [`config package validate`](./config-commands.md#validate-package-configurations-config-package-validate) after the import.

## Diff local zip with deployed version/specific version/staging

To compare local zipped packages with online packages use:

```bash
content-cli t2tc package diff --file <file>
```

As with other commands, use `--json` to export the diff to a file.
To diff against a specific version use the `--baseVersion` parameter. When omitted it will diff against the current deployed version.
To diff against staging use `--baseVersion STAGING`.

```bash
content-cli t2tc package diff --file <file> --baseVersion <version>
```

To diff against the current deployed version and only return whether there are any changes, use the `--hasChanges` flag.

```bash
content-cli t2tc package diff --file <file> --hasChanges
```
