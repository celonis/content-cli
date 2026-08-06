export type AttributeDataType =
    | "STRING"
    | "INTEGER"
    | "LONG"
    | "DOUBLE"
    | "BOOLEAN"
    | "TIMESTAMP"
    | "DATE";

export type PigEntityReferenceType = "OBJECT" | "EVENT_SOURCE" | "RELATIONSHIP";

export type RelationshipType = "TYPE_TO_TYPE" | "INSTANCE_TO_INSTANCE";

export type Cardinality = "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_ONE" | "MANY_TO_MANY";

export type PerspectiveType = "LIVE" | "CACHED";

export interface OntologyAttribute {
    id: string;
    dataType: AttributeDataType;
    required?: boolean;
    description?: string;
}

export interface MappingColumn {
    sourceColumn: string;
    targetColumn: string;
}

export interface Binding {
    name: string;
    namespace?: string;
    schema: string;
    table: string;
    mappingColumns: MappingColumn[];
}

export interface SemanticObjectContent {
    attributes: OntologyAttribute[];
    bindings: Binding[];
    primaryKeys?: string[];
}

export interface SemanticEventSourceContent {
    attributes: OntologyAttribute[];
    bindings: Binding[];
    timestampAttribute: string;
    idAttribute: string;
    primaryKeys?: string[];
}

export interface Reference {
    type: PigEntityReferenceType;
    referenceKey: string;
    namespace?: string;
}

export interface ForeignKeyMapping {
    sourceField: OntologyAttribute;
    targetField: OntologyAttribute;
}

export interface SemanticRelationshipContent {
    source: Reference;
    target: Reference;
    relationshipType?: RelationshipType;
    cardinality?: Cardinality;
    foreignKeyMappings: ForeignKeyMapping[];
}

export interface SemanticPerspectiveContent {
    objects: Reference[];
    events: Reference[];
    relationships: Reference[];
    perspectiveType?: PerspectiveType;
    INSTANTIATE_ALL_EVENTS?: boolean;
}

export interface OntologyNodeRequest<T> {
    key: string;
    name: string;
    namespace?: string;
    content: T;
}

export interface OntologyNodeResponse<T> {
    key: string;
    name: string;
    packageNodeKey?: string;
    content?: T;
}
