import {PackageExportTransport} from "../../src/interfaces/package-export-transport";
import {
    ContentNodeTransport,
    PackageWithVariableAssignments,
    VariablesAssignments
} from "../../src/interfaces/package-manager.interfaces";

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

    public static buildPackageWithVariableAssignments = (key: string, spaceId: string, variableAssignments: VariablesAssignments[]): PackageWithVariableAssignments => {
        return {
            id: "package-id",
            key,
            name: "package-name",
            createdBy: "",
            spaceId,
            variableAssignments
        };
    }
}