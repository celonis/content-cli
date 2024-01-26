import {PackageExportTransport} from "../../src/interfaces/package-export-transport";
import {SpaceTransport} from "../../src/interfaces/save-space.interface";
import {ContentNodeTransport} from "../../src/interfaces/package-manager.interfaces";

export class PackageManagerApiUtils {
    public static buildPackageExportTransport = (key: string, name: string): PackageExportTransport => {
        return {
            id: "",
            key,
            name,
            changeDate: null,
            activatedDraftId: "",
            workingDraftId: "",
            flavor: "",
            version: "",
            dependencies: null,
        };
    }

    public static buildContentNodeTransport = (key: string, spaceId: string): ContentNodeTransport => {
        return {
            id: "",
            key,
            name: "",
            rootNodeKey: "",
            workingDraftId: "",
            activatedDraftId: "",
            rootNodeId: "",
            assetMetadataTransport: null,
            spaceId
        }
    }

    public static buildSpaceTransport = (id: string, name: string = "space-name", iconReference: string = "icon"): SpaceTransport => {
        return {
            id,
            name,
            iconReference,
        };
    }
}