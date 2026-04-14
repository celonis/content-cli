---
name: asset-registry-endpoints
description: >-
  Call asset service endpoints (schema, validate, methodology, examples) for any
  registered asset type using the asset registry descriptor and the content-cli
  api command. Also covers exporting/importing/creating packages via config
  commands. Use when the user asks for a schema, wants to validate an asset,
  needs methodology/best-practices, wants example configurations for an asset
  type, or needs to export/import/list/create packages.
---

# Asset Registry Endpoint Caller

Call any endpoint defined in an asset registry descriptor by combining the
service `basePath` with the endpoint path, then hitting it via `content-cli api request`.

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
by Pacman.

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

## Step 1 — Get the asset descriptor

```bash
$CLI asset-registry get --assetType <ASSET_TYPE> -p <profile>
```

This returns a descriptor like:

```json
{
  "assetType": "BOARD_V2",
  "displayName": "View",
  "service": { "basePath": "/blueprint/api" },
  "endpoints": {
    "schema": "/validation/schema/BOARD_V2",
    "validate": "/validate/BOARD_V2",
    "methodology": "/methodology/BOARD_V2",
    "examples": "/examples/BOARD_V2"
  }
}
```

If you don't know which asset types exist, list them first:

```bash
$CLI asset-registry list -p <profile>
```

## Step 2 — Build the full path

Concatenate `service.basePath` + `endpoints.<endpoint>`:

| Want | Formula | Example |
|------|---------|---------|
| Schema | `basePath + endpoints.schema` | `/blueprint/api/validation/schema/BOARD_V2` |
| Validate | `basePath + endpoints.validate` | `/blueprint/api/validate/BOARD_V2` |
| Methodology | `basePath + endpoints.methodology` | `/blueprint/api/methodology/BOARD_V2` |
| Examples | `basePath + endpoints.examples` | `/blueprint/api/examples/BOARD_V2` |

`methodology` and `examples` are optional — check if they exist in the
descriptor before calling.

**Not all endpoints may be available** for every asset type. Some services may
not have deployed validate, methodology, or examples endpoints yet. If you get
a 404, the endpoint is not implemented for that asset type — do not retry.

## Step 3 — Call the endpoint

> **Note on `api request`**: This command is **beta** and exists as a testing
> mechanism. It hits Celonis APIs using the configured profile's auth — it is
> not a general-purpose HTTP client. Do not use outside of testing.

### Schema (GET)

Returns the full JSON Schema for the asset type's `configuration` object.

```bash
$CLI api request --path "<basePath><endpoints.schema>" -p <profile>
```

### Validate (POST)

```bash
$CLI api request --path "<basePath><endpoints.validate>" --method POST \
  --body '{"assetType":"<TYPE>","packageKey":"<PKG>","nodes":[{"key":"<KEY>","configuration":{...}}]}' \
  -p <profile>
```

### Methodology (GET)

```bash
$CLI api request --path "<basePath><endpoints.methodology>" -p <profile>
```

### Examples (GET)

```bash
$CLI api request --path "<basePath><endpoints.examples>" -p <profile>
```

### Save response to file

```bash
$CLI api request --path "<path>" --json -p <profile>
```

## Troubleshooting: 403 on asset endpoints

If an asset service endpoint returns **403**, the endpoint is likely **not on
the OAuth scope allowlist** for the token. The asset registry (Pacman) APIs may
work, but downstream asset service APIs (e.g. `/blueprint/api/...`,
`/llm-agent/api/...`) need their own allowlisting.

**Tip for asset teams**: if your endpoints return 403 via Content CLI or public
APIs, request that they be added to the OAuth `studio` scope allowlist.

## Full worked example

```bash
# 1. Get descriptor
$CLI asset-registry get --assetType BOARD_V2 --json

# 2. Fetch schema (beta command — testing only)
$CLI api request --path "/blueprint/api/validation/schema/BOARD_V2" --json

# 3. Export the target package
$CLI config export --packageKeys <package-key> --unzip

# 4. Create a new node JSON in the export's nodes/ directory
#    — configuration root must conform to the schema from step 2
#    — set spaceId to the package's space (ask the user)

# 5. Validate and import (--overwrite for existing package, omit for new)
$CLI config import -d <export_dir> --validate --overwrite
```

## Quick reference

| Endpoint | Method | Required | Notes |
|----------|--------|----------|-------|
| schema | GET | Yes | Returns full JSON Schema |
| validate | POST | Yes | May not be deployed for all types yet |
| methodology | GET | No | May not be deployed for all types yet |
| examples | GET | No | May not be deployed for all types yet |
