# Action Flow Commands

## Analyze Action Flows

The analyze operation returns the metadata of Action Flows for one package together with their dependencies. Dependencies
could be webhooks, data structures, variables and other.

In order to analyze Action Flows you can execute the following command:

```
content-cli analyze action-flows -p my-profile-name --packageId <replace-with-package-id> --outputToJsonFile
```

The `--outputToJsonFile` is optional. If specified, the analyze result is saved in a JSON file (`metadata.json`). The
command output will give you all the details.

## Export Action Flows

The export operation allows export of Action Flows of one package together with their dependencies. Dependencies
could be webhooks, data structures, variables and other.

In order to pull Action Flows you can execute the following command:

```
content-cli export action-flows -p my-profile-name --packageId <replace-with-package-id> -f <replace-with-metadata-file-name>
```

_Note_: The `-f` is optional. If specified, it will attach the metadata file to the exported zip.
This file is expected to be received by the `action-flows analyze` command, and manually be populated with the mappings source to target package.
