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

## Preview App

Serve a local dev server to the Local preview of a Codespace asset, with the same sandbox rules as the published app.

```
content-cli sdk preview [--target <target>] [--port <port>] [--allow-inline-scripts]
```

- `--target` is the origin of your app's dev server. Defaults to `http://localhost:4200`.
- `--port` is the HTTPS port the Local preview loads. Defaults to `4300`.
- `--allow-inline-scripts` allows inline scripts in your dev server's HTML pages. Off by default.

The command does not need a profile. It serves your dev server over HTTPS with a self-signed certificate stored in `~/.celonis-content-cli-preview`, and forwards requests and WebSocket connections to the target. If the Local preview stays blank, open the printed `https://localhost:<port>` URL in a browser tab, accept the certificate, and reload the preview. Press Ctrl+C to stop.

Published apps block inline scripts, and so does the Local preview by default. Some dev servers inject one, such as React's Fast Refresh preamble, and the app stays blank without it. Pass `--allow-inline-scripts` to allow them: the command adds a hash of each inline script to the page's `script-src`. Either way it prints a warning for each inline script the first time it sees it. Move any inline script of your own into a separate file before publishing.
