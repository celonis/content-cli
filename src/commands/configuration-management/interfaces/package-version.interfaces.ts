export interface PackageVersionTransport {
    packageKey: string;
    historyId: string;
    version: string;
    changeDate: string;
    publishDate: string;
    publishMessage: string;
    deployed: boolean;
    publishedBy: string;
}

export interface SavePackageVersionTransport {
    version?: string;
    versionBumpOption?: VersionBumpOption;
    summaryOfChanges?: string;
    nodeFilter?: NodeFilterTransport;
}

export enum VersionBumpOption {
    NONE = "NONE",
    PATCH = "PATCH",
}

export interface NodeFilterTransport {
    filterType: "INCLUDE";
    keys: string[];
}

export interface PackageVersionCreatedTransport {
    packageKey: string;
    version: string;
    summaryOfChanges: string;
    creationDate: string;
    createdBy: string;
}
