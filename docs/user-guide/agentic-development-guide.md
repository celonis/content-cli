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

The descriptor returns the `basePath` and endpoint paths for schema, validate, methodology, and examples.

### 2. Fetch the schema

Combine `basePath` + `endpoints.schema` and call it:

```bash
content-cli api request --path "/blueprint/api/validation/schema/BOARD_V2" --json
```

The schema describes the valid structure of the asset's `configuration` field. This is the only part of the asset governed by the schema — everything else is platform metadata.

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

### 5. Import

```bash
content-cli config import -d <export_dir> --overwrite
```

This creates a new version in staging (not deployed). To create a brand-new package instead of updating, omit `--overwrite`.

To later export a staging version, use `--keysByVersion`:

```bash
content-cli config export --keysByVersion <packageKey>_<version> --unzip
```

## Troubleshooting

**403 on asset service endpoints** — The asset registry (Pacman) APIs and asset service endpoints use separate OAuth scopes. If schema/validate endpoints return 403, the service's endpoints may not be on the `studio` scope allowlist yet. Asset teams should request their endpoints be added to the allowlist.

**404 on validate / methodology / examples** — Not all services have deployed all endpoints. The schema endpoint is required; the others may not be available yet.

**500 on import** — Ensure `spaceId` is set on every node and `schemaVersion` matches the descriptor's `assetSchema.version`.

## Further reading

- [Asset Registry Commands](./asset-registry-commands.md)
- [Config Commands](./config-commands.md)
