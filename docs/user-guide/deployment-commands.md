# Deployment Commands (beta)

The **deployment** command group allows you to create deployments, list their history, check active deployments, and retrieve deployables and targets.

## Create Deployment

Create a new deployment for a given package version in a target, based on the deployable type.

```
content-cli deployment create --packageKey myPackage --packageVersion 1.0.0 --deployableType app-package --targetId targetId
```

The command will return the created deployment, or an error if the deployment could not be created.
It is also possible to use the `--json` option for writing the extended response to a file that gets created in the working directory.

## List Deployment History

List the deployment history, optionally filtered by package, target, type, status, or creator.

```
content-cli deployment list history
```

Additional filtering options:

- `--packageKey <packageKey>` – Filter deployment history by package key
- `--targetId <targetId>` – Filter deployment history by target ID
- `--deployableType <deployableType>` – Filter deployment history by deployable type
- `--status <status>` – Filter deployment history by status
- `--createdBy <createdBy>` – Filter deployment history by creator

The response is paginated, and the page size can be controlled with the `--limit` and `--offset` options (defaults to 100 and 0 respectively).

It is also possible to use the `--json` option for writing the extended response to a file that gets created in the working directory.

## List Active Deployments

Get the active deployment(s) for a given target or package.

For getting the active deployment for a target the `--targetId` option should be used:

```
content-cli deployment list active --targetId targetId
```

For getting the active deployment for a package the `--packageKey` option should be used:

```
content-cli deployment list active --packageKey myPackage
```

The `--targetIds` option can be used to filter the response by multiple target IDs. The option should be used with a comma-separated list of target IDs.

The response of listing active deployments for a package will return all active deployments for that package across all targets.
The response is paginated, and the page size can be controlled with the `--limit` and `--offset` options (defaults to 100 and 0 respectively).

For both options, it is also possible to use the `--json` option for writing the extended response to a file that gets created in the working directory.

Note: You must provide either `--packageKey` or `--targetId`, not both.

## List Deployables

List all available deployables.

```
content-cli deployment list deployables --flavor STUDIO
```

The `--flavor` option can be used to filter the deployables by flavor. The available flavors are: **STUDIO** and **OCDM**.
It is also possible to use the `--json` option for writing the extended response to a file that gets created in the working directory.

## List Targets

List all targets for a given deployable type (and optionally a package key).

```
content-cli deployment list targets --deployableType app-package
```

The `--packageKey` option can be used to get targets for a specific package.
It is also possible to use the `--json` option for writing the extended response to a file that gets created in the working directory.
