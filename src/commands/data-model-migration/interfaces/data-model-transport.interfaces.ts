export type ColumnType = "INTEGER" | "DATE" | "TIME" | "DATETIME" | "FLOAT" | "BOOLEAN" | "STRING";

export type DataModelType = "CASE_CENTRIC" | "OBJECT_CENTRIC";

export interface DataModelColumnTransport {
    name: string;
    type: ColumnType;
    primaryKey?: boolean;
}

export interface DataModelTableTransport {
    id: string;
    name: string;
    alias?: string;
    aliasOrName?: string;
    dataModelId?: string;
    dataSourceId?: string;
    primaryKeys?: string[];
    columns?: DataModelColumnTransport[];
}

export interface DataModelForeignKeyColumnTransport {
    id?: string;
    sourceColumnName: string;
    targetColumnName: string;
}

export interface DataModelForeignKeyTransport {
    id: string;
    dataModelId?: string;
    sourceTableId: string;
    targetTableId: string;
    columns: DataModelForeignKeyColumnTransport[];
}

export interface DataModelConfigurationTransport {
    id?: string;
    dataModelId?: string;
    activityTableId: string;
    caseTableId?: string;
    caseIdColumn: string;
    activityColumn: string;
    timestampColumn: string;
    endTimestampColumn?: string;
    sortingColumn?: string;
    costColumn?: string;
    userColumn?: string;
    defaultConfiguration?: boolean;
}

export interface DataModelTransport {
    id: string;
    name: string;
    poolId?: string;
    dataModelType?: DataModelType;
    tables: DataModelTableTransport[];
    foreignKeys?: DataModelForeignKeyTransport[];
    processConfigurations?: DataModelConfigurationTransport[];
}
