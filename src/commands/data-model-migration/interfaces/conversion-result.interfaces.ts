import { SaveNodeTransport } from "../../configuration-management/interfaces/node.interfaces";

export interface ConversionResult {
    objects: SaveNodeTransport[];
    eventSources: SaveNodeTransport[];
    relationships: SaveNodeTransport[];
    perspective: SaveNodeTransport;
}

export interface ConversionOptions {
    poolId: string;
    bindingSchema: string;
    packageKey: string;
    namespace?: string;
}
