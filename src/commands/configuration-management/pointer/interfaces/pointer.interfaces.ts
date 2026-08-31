export interface PackagePointerTransport {
    packageKey: string;
    pointerName: string;
    branchPackageKey: string;
    updatedAt?: string;
    updatedBy?: string;
}

export interface SetPackagePointerTransport {
    branchPackageKey: string;
}

export interface ConflictErrorDetailsTransport {
    errorCode?: string;
}

export interface ConflictErrorTransport {
    message?: string;
    details?: ConflictErrorDetailsTransport[];
}
