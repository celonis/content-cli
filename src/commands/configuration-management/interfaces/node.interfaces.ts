export interface NodeConfiguration {
    [key: string]: any;
}

export interface NodeTransport {
    id: string;
    key: string;
    name: string;
    packageNodeKey: string;
    parentNodeKey?: string;
    packageNodeId: string;
    type: string;
    configuration?: NodeConfiguration;
    invalidConfiguration?: string;
    invalidContent: boolean;
    creationDate: string;
    changeDate: string;
    createdBy: string;
    updatedBy: string;
    schemaVersion: number;
    flavor?: string;
}
