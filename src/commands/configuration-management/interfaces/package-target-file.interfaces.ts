export interface PackageTargetVariable {
    key: string;
    type: string;
    value: any;
}

export interface PackageTargetFile {
    packageKey: string;
    variables: PackageTargetVariable[];
}
