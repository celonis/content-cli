export declare type DataPoolStatus = "CANCEL" | "FAIL" | "QUEUED" | "RUNNING" | "SKIPPED" | "SUCCESS" | "UNCONFIGURED";
export type Tag = {};

export declare class DataSourceSlimTransport {
    id: string;
    name: string;
    imported: boolean;
    importedPoolId: string;
}

export interface DataPoolSlimTransport {
    id: string;
    name: string;
    status: DataPoolStatus;
    lastExecutionStartDate: Date;
    createdBy: string;
    tags: Tag[];
    rawDataSize: number;
    dataSources: DataSourceSlimTransport[];
}
export declare class DataPoolPageTransport {
    content: DataPoolSlimTransport[];
    pageSize: number;
    pageNumber: number;
    totalCount: number;
}

export declare class DataPoolInstallVersionReport {
    dataModelIdMappings: Map<string, string>;
}
