# Data Model Migration Commands

These commands export a Data Integration data model from cloud-data-integration and convert it into semantic entities in a target pig package via pig-sl-ontology.

Supported mappings:

| Data Integration | Semantic entity |
|---|---|
| Table | Object (with data binding) |
| Process configuration (event log) | Event source (with data binding) |
| Classic foreign key | Relationship |
| Data model | Perspective |

Object-centric **object links** (`signal-links` in cloud-data-integration) are **not** supported. The converter only reads classic `foreignKeys[]` from the `/transport` export.

## Export Data Model

Downloads the full data model transport (tables, columns, foreign keys, process configurations):

```
content-cli export data-model --poolId <pool-id> --dataModelId <data-model-id> --profile <profile> [--outputToJsonFile]
```

Example:

```
content-cli export data-model --poolId 80a1389d-50c5-4976-ad6e-fb5b7a2b5517 --dataModelId 1b9b368b-e0df-4e74-99e8-59e2febe9687 --profile local --outputToJsonFile
```

## Push Semantic Model

Converts the data model and pushes semantic entities into a target pig package:

```
content-cli push semantic-model \
  --poolId <pool-id> \
  --dataModelId <data-model-id> \
  --package <package-key> \
  --profile <profile> \
  [--schema <lake-schema>] \
  [--namespace <namespace>] \
  [--fromFile <transport.json>] \
  [--dryRun] \
  [--outputToJsonFile]
```

Options:

- `--schema`: Physical lake schema used in data bindings. When omitted, the CLI derives `datapipelines_<poolId>_draft` (hyphens in the pool id become underscores).
- `--fromFile`: Skip download and convert a previously exported transport JSON file.
- `--dryRun`: Convert only; print or write the ontology payloads without calling pig-sl-ontology.
- `--namespace`: Optional namespace for created semantic entities (defaults to ontology `"local"` when omitted).

Push order: objects → event sources → relationships → perspective.

Example dry run:

```
content-cli push semantic-model \
  --poolId 80a1389d-50c5-4976-ad6e-fb5b7a2b5517 \
  --dataModelId 1b9b368b-e0df-4e74-99e8-59e2febe9687 \
  --package my-context-model \
  --profile local \
  --dryRun
```

## Authentication

- **Download** uses the existing `integration.data-pools` OAuth scope (same as other data pool commands).
- **Push** calls `/pig-sl-ontology/api/ontology/packages/{packageKey}/semantic-*` with the profile bearer token or API key. Ensure the profile has edit access to the target package.
