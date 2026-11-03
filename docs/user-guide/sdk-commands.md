# SDK Commands

The **sdk** command group provides the commands to implement custom apps for Codehub assets using the Celonis SDK.

## Publish App

Publish a build of a custom app as a new version of its Codehub asset.

```
content-cli sdk publish --appId <appId> --dist <dist> [--buildVersion <buildVersion>] [--message <message>]
```

- `--buildVersion` is the semantic version of the build, e.g. `2.1.0`. Defaults to the next major version, or `1.0.0`. Needs to be strictly greater than the most recent version.
- `--message` describes the build, e.g. what changed. At most 500 characters, longer messages are rejected.

The command compresses the given build directory and uploads it for the app. On success, the version assigned to the build is printed, which can then be selected on the Codehub asset.

## Preview App

Proxy your local dev server to preview the app inside Celonis.

```
content-cli sdk preview [--target <target>] [--port <port>] [--allow-inline-scripts]
```

- `--target` is the origin of your app's dev server. Defaults to `http://localhost:4200`.
- `--port` is the HTTPS port the Local preview loads. Defaults to `4300`.
- `--allow-inline-scripts` allows inline scripts in your dev server's HTML pages. Off by default.

The command does not need a profile. It serves your dev server over HTTPS with a self-signed certificate stored in `~/.celonis-content-cli-preview`, and forwards requests and WebSocket connections to the target. If the Local preview stays blank, open the printed `https://localhost:<port>` URL in a browser tab, accept the certificate, and reload the preview. Press Ctrl+C to stop.

Published apps block inline scripts, and so does the Local preview by default. Some dev servers inject one, such as React's Fast Refresh preamble, and the app stays blank without it. Pass `--allow-inline-scripts` to allow them: the command adds a hash of each inline script to the page's `script-src`. Either way it prints a warning for each inline script the first time it sees it. Move any inline script of your own into a separate file before publishing.

## Print Token

Print a fresh token that only grants read access to the Celonis SDK, e.g. to authenticate against the npm registry.

```
content-cli sdk token
```

The command requires a device code or client credentials profile. API keys can be used directly for authentication instead.
