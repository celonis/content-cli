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
