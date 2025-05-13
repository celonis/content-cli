// tslint:disable-next-line:no-var-requires
// @ts-ignore
import {version} from "./../../package.json";

export class VersionUtils {
    public static getCurrentCliVersion(): string {
        return version;
    }
}
