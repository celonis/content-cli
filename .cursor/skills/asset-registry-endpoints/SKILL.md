---
name: asset-registry-endpoints
description: >-
  Discover asset types, fetch schemas, examples, and methodology via
  content-cli asset-registry commands. Also covers exporting/importing/creating
  packages via config commands. Use when the user asks for a schema, wants to
  validate an asset, needs methodology/best-practices, wants example
  configurations for an asset type, or needs to export/import/list/create
  packages.
---

# Asset Registry Endpoint Caller

Use `content-cli asset-registry` commands to discover asset types and fetch
schemas, examples, and methodology for any registered asset type.

## Prerequisites

A content-cli profile must be configured for the target environment:

```bash
content-cli profile list
```

If running from a local build (not published):

```bash
CLI="node <path-to-content-cli>/dist/content-cli.js"
```

Otherwise just use `content-cli` directly. All examples below use `$CLI`.

## Prefer config commands

Use `config` commands for all package operations. Avoid the `studio` commands —
they exist but are not the preferred path for this workflow.

| Task | Command |
|------|---------|
| List packages | `$CLI config list` |
| Export packages | `$CLI config export --packageKeys <keys...> --unzip` |
| Import / update packages | `$CLI config import -d <dir> --overwrite` |
| Create a new package | `$CLI config import -d <dir>` (no `--overwrite`) |

## Exporting packages

```bash
$CLI config export --packageKeys <key1> [<key2> ...] --unzip
```

Key options:
- `--packageKeys <keys...>` — exports the latest **deployed** version only
- `--keysByVersion <keys...>` — export a specific version (use this to export
  non-deployed/staging versions that were just imported)
- `--unzip` — unzip the export into a directory (recommended for inspection)
- `--withDependencies` — include variables and dependencies

The `--unzip` output has this structure:

```
export_<uuid>/
├── manifest.json
├── studio.json
├── variables.json
└── <packageKey>_<version>/
    ├── package.json          ← package metadata (key, name, variables, dependencies)
    └── nodes/
        ├── <nodeKey1>.json   ← asset node
        └── <nodeKey2>.json
```

### Importing packages

```bash
$CLI config import -d <export_dir> --validate --overwrite
```

- `--validate` — performs schema validations before importing. If there are
  validation errors the import is **not** performed and the errors are returned.
  If there are no errors, the package and its assets are imported normally.
- `--overwrite` — required when updating an existing package
- Without `--overwrite` — creates a **new** package (use for first-time import)

**Versioning**: each import creates a new version. That version is **not**
deployed/activated — it remains in staging. A subsequent `config export
--packageKeys` will NOT include it (it exports the latest deployed version).
Use `--keysByVersion` to export a specific staging version.

**`manifest.json`**: do not modify the `activeVersion` field — it is metadata
used by a specific client and is ignored by the import flow.

### Discovering the export format

If you're unsure about the directory structure, `manifest.json` format, or
`studio.json` shape, export an existing package as a reference:

```bash
$CLI config export --packageKeys <any-known-key> --unzip
```

Inspect the output to understand the expected format. This is the recommended
approach when creating a new package from scratch.

## Creating a new package

To create a brand-new package via import:

1. Build the export directory structure (use an existing export as reference)
2. Set the `key` in `package.json` to the new package key
3. Create node JSONs for each asset
4. Run `$CLI config import -d <dir>` (**without** `--overwrite`)

The user must provide:
- The **space ID** where the package should live (set `spaceId` on each node)
- The **package key** they want to use

## Node JSON structure

The `configuration` property holds the actual asset content. The asset-type
schema from the asset registry applies to the **root of `configuration`** —
nothing above or around it. If the schema defines a `metadata` field inside
`configuration`, that is the asset's own metadata, not a platform concept.

Everything outside `configuration` is configuration-management metadata managed
by the platform.

```json
{
  "key": "my-view",
  "parentNodeKey": "my-package-key",
  "packageNodeKey": "my-package-key",
  "name": "My View",
  "type": "BOARD_V2",
  "configuration": { ... },
  "schemaVersion": 2,
  "dependenciesConfiguration": { "dependencies": [{ "key": "other-asset-key", "type": "SEMANTIC_MODEL" }] },
  "spaceId": "b9a21c92-...",
  "nodeType": "ASSET",
  "assetType": "BOARD_V2",
  "order": 0
}
```

Field reference:

| Field | Description | Required |
|-------|-------------|----------|
| `key` | Unique key of the asset within the package | Yes |
| `parentNodeKey` | Key of the parent asset. If directly under the package, use the package key | Yes |
| `packageNodeKey` | Key of the package | Yes |
| `name` | Display name shown in the UI | Yes |
| `type` | Asset type (e.g. `BOARD_V2`) — matches the asset registry | Yes |
| `configuration` | **The actual asset content.** Schema root = this object | Yes |
| `schemaVersion` | Use the version from the asset descriptor's `assetSchema.version` field (returned by `asset-registry get`). Do not invent a value | Yes |
| `dependenciesConfiguration` | Dependencies to other assets in the package. Each entry has `key` (target asset key) and `type` (target asset type). Use `{ "dependencies": [] }` when there are none | Yes |
| `nodeType` | `ASSET` for all assets, `PACKAGE` for the package node | Yes |
| `assetType` | Same as `type` — redundant resolver field | Yes |
| `spaceId` | Space ID. Ask the user for this. Must match the package's space. Omitting causes 500 errors on import | Yes (for import) |
| `showInViewerMode` | Copy from example if available, otherwise `false` | No |
| `order` | Display order in the UI tree | No |

### package.json structure

| Field | Description |
|-------|-------------|
| `key` | Package key |
| `name` | Package display name |
| `nodeType` | Always `PACKAGE` |
| `configuration` | Package-level configuration (usually `{}`) |
| `variables` | Package variables (e.g. DATA_MODEL bindings) |
| `dependencies` | Package-level dependencies |

## Step 1 — Discover asset types

List all registered asset types:

```bash
$CLI asset-registry list -p <profile>
```

Get the full descriptor for a specific type (includes schema version, service
info, and endpoint availability):

```bash
$CLI asset-registry get --assetType <ASSET_TYPE> -p <profile>
```

## Step 2 — Fetch schema, examples, or methodology

Use these commands to get asset authoring resources directly. Each proxies
through the platform to the owning asset service — no manual path construction
needed.

### Schema (GET)

Returns the full JSON Schema for the asset type's `configuration` object.

```bash
$CLI asset-registry schema --assetType <ASSET_TYPE> -p <profile>
```

Save to file:

```bash
$CLI asset-registry schema --assetType <ASSET_TYPE> --json -p <profile>
```

### Examples (GET)

Returns example configurations for the asset type. Not all asset types provide
examples — a 404 means the endpoint is not available.

```bash
$CLI asset-registry examples --assetType <ASSET_TYPE> -p <profile>
```

### Methodology (GET)

Returns best-practices and methodology guidance. Not all asset types provide
methodology — a 404 means the endpoint is not available.

```bash
$CLI asset-registry methodology --assetType <ASSET_TYPE> -p <profile>
```

### Validate (POST — via config import)

Use `config import --validate` to validate assets against their schema before
importing:

```bash
$CLI config import -d <export_dir> --validate --overwrite -p <profile>
```

## Troubleshooting

**404 on examples / methodology** — Not all asset services have deployed these
endpoints. The schema endpoint is required for all registered types; the others
are optional.

**500 on proxy endpoints** — The platform proxies requests to the owning asset
service. A 500 typically means the downstream service is unavailable or returned
an unexpected response.

**500 on import** — Ensure `spaceId` is set on every node and `schemaVersion`
matches the descriptor's `assetSchema.version`.

## Full worked example

```bash
# 1. Discover available asset types
$CLI asset-registry list -p <profile>

# 2. Get the descriptor (includes schema version)
$CLI asset-registry get --assetType BOARD_V2 --json -p <profile>

# 3. Fetch the schema
$CLI asset-registry schema --assetType BOARD_V2 --json -p <profile>

# 4. (Optional) Fetch examples for reference
$CLI asset-registry examples --assetType BOARD_V2 --json -p <profile>

# 5. Export the target package
$CLI config export --packageKeys <package-key> --unzip -p <profile>

# 6. Create a new node JSON in the export's nodes/ directory
#    — configuration root must conform to the schema from step 3
#    — set spaceId to the package's space (ask the user)

# 7. Validate and import (--overwrite for existing package, omit for new)
$CLI config import -d <export_dir> --validate --overwrite -p <profile>
```

## Quick reference

| Command | Description |
|---------|-------------|
| `asset-registry list` | List all registered asset types |
| `asset-registry get --assetType X` | Get the full descriptor for an asset type |
| `asset-registry schema --assetType X` | Get the JSON Schema for the asset's configuration |
| `asset-registry examples --assetType X` | Get example configurations (if available) |
| `asset-registry methodology --assetType X` | Get methodology / best-practices (if available) |
| `config list` | List packages |
| `config export --packageKeys X --unzip` | Export packages |
| `config import -d <dir> --validate --overwrite` | Validate and import packages |
