// tslint:disable-next-line:no-var-requires
const { version } = require("../../package.json");

export class VersionUtils {
    public static getCurrentCliVersion(): string {
        return version;
    }
}
