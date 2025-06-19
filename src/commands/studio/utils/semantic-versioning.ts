export class SemanticVersioning {
    private version: string;

    constructor(version: string) {
        this.version = version;
    }

    public isGreaterThan(versionToCompare: SemanticVersioning): boolean {
        const splitVersion1 = this.version.split(".");
        const splitVersion2 = versionToCompare.version.split(".");

        const majorVersion1 = splitVersion1[0];
        const majorVersion2 = splitVersion2[0];

        const minorVersion1 = splitVersion1[1];
        const minorVersion2 = splitVersion2[1];

        const patchVersion1 = splitVersion1[2];
        const patchVersion2 = splitVersion2[2];

        return (majorVersion1 > majorVersion2) || (minorVersion1 > minorVersion2) || (patchVersion1 > patchVersion2);
    }
}