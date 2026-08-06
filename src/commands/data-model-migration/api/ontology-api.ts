import { Context } from "../../../core/command/cli-context";
import { FatalError } from "../../../core/utils/logger";
import { HttpClient } from "../../../core/http/http-client";
import {
    OntologyNodeRequest,
    OntologyNodeResponse,
    SemanticEventSourceContent,
    SemanticObjectContent,
    SemanticPerspectiveContent,
    SemanticRelationshipContent,
} from "../interfaces/ontology.interfaces";

const ONTOLOGY_BASE = "/pig-sl-ontology/api/ontology/packages";

export class OntologyApi {

    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    /** Creates a semantic object in the target package. */
    public async createObject(
        packageKey: string,
        request: OntologyNodeRequest<SemanticObjectContent>
    ): Promise<OntologyNodeResponse<SemanticObjectContent>> {
        return this.post(`${ONTOLOGY_BASE}/${packageKey}/semantic-objects`, request);
    }

    /** Creates a semantic event source in the target package. */
    public async createEventSource(
        packageKey: string,
        request: OntologyNodeRequest<SemanticEventSourceContent>
    ): Promise<OntologyNodeResponse<SemanticEventSourceContent>> {
        return this.post(`${ONTOLOGY_BASE}/${packageKey}/semantic-event-sources`, request);
    }

    /** Creates a semantic relationship in the target package. */
    public async createRelationship(
        packageKey: string,
        request: OntologyNodeRequest<SemanticRelationshipContent>
    ): Promise<OntologyNodeResponse<SemanticRelationshipContent>> {
        return this.post(`${ONTOLOGY_BASE}/${packageKey}/semantic-relationships`, request);
    }

    /** Creates a semantic perspective in the target package. */
    public async createPerspective(
        packageKey: string,
        request: OntologyNodeRequest<SemanticPerspectiveContent>
    ): Promise<OntologyNodeResponse<SemanticPerspectiveContent>> {
        return this.post(`${ONTOLOGY_BASE}/${packageKey}/semantic-perspectives`, request);
    }

    private post<TContent, TResponse>(
        url: string,
        request: OntologyNodeRequest<TContent>
    ): Promise<TResponse> {
        return this.httpClient()
            .post(url, request)
            .catch((error) => {
                throw new FatalError(`Problem creating semantic entity '${request.key}': ${error}`);
            });
    }
}
