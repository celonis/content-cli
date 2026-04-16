# Agentic Development Guide

Use the Asset Registry to discover asset schemas and programmatically create assets via [Content CLI](https://github.com/celonis/content-cli). Share this guide with your AI coding agent to get started.

## For agents

Fetch and follow the machine-readable skill file — it contains step-by-step instructions for the entire workflow (discovery, schema fetching, asset creation, import/export, and troubleshooting):

```
https://raw.githubusercontent.com/celonis/content-cli/main/.cursor/skills/asset-registry-endpoints/SKILL.md
```

If you have the Content CLI repo cloned locally, the skill is at `.cursor/skills/asset-registry-endpoints/SKILL.md`.

## Prerequisites

- **Content CLI** installed or built locally (`yarn install && yarn build`)
- A configured **CLI profile** (`content-cli profile create`)

## Workflow overview

### 1. Discover asset types

```bash
content-cli asset-registry list
content-cli asset-registry get --assetType BOARD_V2
```

The descriptor returns metadata including the schema version needed for asset creation.

### 2. Fetch the schema

```bash
content-cli asset-registry schema --assetType BOARD_V2 --json
```

The schema describes the valid structure of the asset's `configuration` field. This is the only part of the asset governed by the schema — everything else is platform metadata.

You can also fetch examples and methodology when available:

```bash
content-cli asset-registry examples --assetType BOARD_V2 --json
content-cli asset-registry methodology --assetType BOARD_V2 --json
```

### 3. Export the target package

```bash
content-cli config export --packageKeys <package-key> --unzip
```

This gives you the directory structure with `package.json`, `manifest.json`, and existing node JSONs to use as reference.

### 4. Create the asset

Add a new JSON file in the `nodes/` directory:

```json
{
  "key": "my-new-asset",
  "parentNodeKey": "<package-key>",
  "packageNodeKey": "<package-key>",
  "name": "My New Asset",
  "type": "<ASSET_TYPE>",
  "configuration": { ... },
  "schemaVersion": 2,
  "dependenciesConfiguration": { "dependencies": [] },
  "spaceId": "<space-uuid>",
  "nodeType": "ASSET",
  "assetType": "<ASSET_TYPE>"
}
```

Set `schemaVersion` to the value from the asset descriptor's `assetSchema.version` field (returned by `asset-registry get`). The `spaceId` is required — omitting it causes import errors.

### 5. Validate and import

```bash
content-cli config import -d <export_dir> --validate --overwrite
```

The `--validate` option performs schema validations for the assets. If there are no schema validations, then the package and its assets are imported. Otherwise, the validation errors are returned and the package import isn't performed.

This creates a new version in staging (not deployed) if there are no schema validation errors. To create a brand-new package instead of updating, omit `--overwrite`.

To later export a staging version, use `--keysByVersion`:

```bash
content-cli config export --keysByVersion <packageKey>_<version> --unzip
```

## Troubleshooting

**404 on examples / methodology** — Not all asset services have deployed these endpoints. The schema endpoint is required for all registered types; the others are optional.

**500 on proxy endpoints** — The platform proxies requests to the owning asset service. A 500 typically means the downstream service is unavailable or returned an unexpected response.

**500 on import** — Ensure `spaceId` is set on every node and `schemaVersion` matches the descriptor's `assetSchema.version`.

## Further reading

- [Asset Registry Commands](./asset-registry-commands.md)
- [Config Commands](./config-commands.md)
