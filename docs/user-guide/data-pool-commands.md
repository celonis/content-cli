# Data Pool Commands

## Export Data Pool

The export operation allows export of a Data Pool together with its dependencies. Dependencies
could be imported data sources and related objects, data source exports, scheduling triggers and other.

In order to pull a Data Pool you can execute the following command:

```
content-cli export data-pool --id <replace-with-pool-id> --profile local --outputToJsonFile
```

_Note_: The `--outputToJsonFile` is optional. If specified, the exported data pool is saved in a JSON file. The
command output will give you all the details.

## Batch Import Multiple Data Pools

The import operation allows import of multiple Data Pools together with their dependencies. Dependencies
could be imported data sources and related objects, data source exports, scheduling triggers and other.

In order to batch push a list of data pools use the following command:

```
content-cli import data-pools --jsonFile ./request.json --profile dev1 --outputToJsonFile
```

### Input

* The `request.json` file contains the batch import JSON request.
* The JSON request looks the following way:

```json
{
    "targetTeamDomain": "dev1",
    "dataPoolImportRequests": [
        {
            "targetPoolId": "80a1389d-50c5-4976-ad6e-fb5b7a2b5517",
            "dataSourceMappings": {
                "69e7c6b8-a36c-48ee-8dba-9bb89baf41dd": "98b4b2d9-898d-4b72-aeb9-ebd87c097cb3",
                "2ec72366-c84f-4896-9f7a-9db1891aeb54": "082a754f-e971-44d8-993a-053707e4a307"
            },
            "dataPool": {...}
        },
        {
            "targetPoolId": "1b9b368b-e0df-4e74-99e8-59e2febe9687",
            "dataSourceMappings": {
                "e9359d63-5ccf-4f0d-8da3-24cda8a42c01": "096c0280-4cb9-4279-a003-b77698287aba",
                "8a1b2a1e-1015-4c7b-8cdc-b8efea1ad894": "e971e8d1-96d4-488a-9e1d-6cff0c4a9813"
            },
            "dataPool": {...}
        }
    ]
}
```

In the above JSON:

1. `targetTeamDomain`: the destination team domain, into which the data pools data is pushed.
2. `sourcePoolId`: the source Data Pool ID.
3. `targetPoolId`: the target Data Pool ID to which the source Data Pool ID should be mapped to.
4. `dataSourceMappings`: the source Data Source ID to destination Data Source ID mappings.
5. `dataPool`: the Data Pool data exported via the `export data-pool` command

### Output

The command outputs an import report.

If the `--outputToJsonFile` option is specified, the import report will be written to a JSON file.
The command output will give you all the details.

## Updating Connection Properties

In some cases, it might be required to update connection properties in data pools programmatically.
Examples include governance and compliance reasons or mechanisms which are rotating credentials automatically.

With the `get` and `set` commands, users can update properties from connections in an automated fashion.

You can get a list of all connections in a data pool using the `list` command:

```
content-cli list connection --profile <profile> --dataPoolId <dataPoolId>
```

Depending on the type of source, the updatable properties may differ. You can use the following command to
get a full list of properties for a data source connection:

```
content-cli get connection --profile <profile> --dataPoolId <dataPoolId> --connectionId <connectionId>
```

You can then update the property you want to update using the `set` command:

```
content-cli set connection --profile <profile> --dataPoolId <dataPoolId> --connectionId <connectionId> --property <property> --value <value>
```
