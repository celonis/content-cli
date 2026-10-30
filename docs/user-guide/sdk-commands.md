# SDK Commands

The **sdk** command group provides the commands to implement custom apps for Codespace assets using the Celonis SDK.

## Download SDK

Download the latest Celonis SDK generated for a Codespace asset into the hidden `.celonis-sdk` directory of the working directory.

```
content-cli sdk download --appId <appId>
```

The SDK is stored as an npm package tarball at `./.celonis-sdk/<appId>.tgz` and can be installed with:

```
npm install ./.celonis-sdk/<appId>.tgz
```

Running the command again replaces the previously downloaded SDK with the latest version.

## Publish App

Publish a build of a custom app as a new version of its Codespace asset.

```
content-cli sdk publish --appId <appId> --dist <dist>
```

The command compresses the given build directory and uploads it for the app. On success, the version assigned to the build is printed, which can then be selected on the Codespace asset.

## Print Token

Print a fresh token that only grants read access to the Celonis SDK, e.g. to authenticate against the npm registry.

```
content-cli -q sdk token
```

The token is printed to the console without any other output when the `-q` option is set, so it can be used in scripts, e.g. to configure npm:

```
npm config set //<team>.celonis.cloud/pro-code-app-manager/api/npm/:_authToken "$(content-cli -q sdk token)"
```

The command requires a device code or client credentials profile. API keys can be used directly for authentication instead.
