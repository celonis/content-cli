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
