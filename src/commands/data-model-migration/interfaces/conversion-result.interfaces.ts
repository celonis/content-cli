import {
    OntologyNodeRequest,
    SemanticEventSourceContent,
    SemanticObjectContent,
    SemanticPerspectiveContent,
    SemanticRelationshipContent,
} from "./ontology.interfaces";

export interface ConversionResult {
    objects: OntologyNodeRequest<SemanticObjectContent>[];
    eventSources: OntologyNodeRequest<SemanticEventSourceContent>[];
    relationships: OntologyNodeRequest<SemanticRelationshipContent>[];
    perspective: OntologyNodeRequest<SemanticPerspectiveContent>;
}

export interface ConversionOptions {
    poolId: string;
    bindingSchema: string;
    namespace?: string;
}
