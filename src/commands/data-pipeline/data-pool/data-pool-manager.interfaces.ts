export declare type DataPoolStatus =
  | "CANCEL"
  | "FAIL"
  | "QUEUED"
  | "RUNNING"
  | "SKIPPED"
  | "SUCCESS"
  | "UNCONFIGURED";
export type Tag = {};

export declare class DataSourceSlimTransport {
  public id: string;
  public name: string;
  public imported: boolean;
  public importedPoolId: string;
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
  public content: DataPoolSlimTransport[];
  public pageSize: number;
  public pageNumber: number;
  public totalCount: number;
}

export declare class DataPoolInstallVersionReport {
  public dataModelIdMappings: Map<string, string>;
}
