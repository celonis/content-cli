import { NodeTransport } from "./node.interfaces";

export interface PackageTransport {
    id: string;
    key: string;
    name: string;
    type?: string;
    version?: string;
    flavor?: string;
    schemaVersion?: number;
    createdBy?: string;
    updatedBy?: string;
    creationDate?: string;
    changeDate?: string;
    [key: string]: any;
}

export interface SinglePackageImportResult {
    importedPackage: PackageTransport;
    importedNodes: NodeTransport[];
}
