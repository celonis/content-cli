import {PackageExportTransport} from "../../interfaces/package-export-transport";
import {packageApi} from "../../api/package-api";
import {variableService} from "../package-manager/variable-service";
import {PackageManagerVariableType} from "../../interfaces/package-manager.interfaces";
import {dataModelService} from "../package-manager/datamodel-service";

class StudioService {

    public async setSpaceIdForStudioPackages(packages: PackageExportTransport[]): Promise<void> {
        const packageByKey = new Map<string, PackageExportTransport>();
        packages.forEach(pkg => packageByKey.set(pkg.key, pkg));

        const studioPackages = await packageApi.findAllPackages();
        studioPackages.forEach(studioPackage => {
            if (packageByKey.has(studioPackage.key)) {
                packageByKey.get(studioPackage.key).spaceId = studioPackage.spaceId;
            }
        });
    }

    public async setDataModelsForStudioPackages(packages: PackageExportTransport[]): Promise<void> {
        const packageByKey = new Map<string, PackageExportTransport>();
        packages.forEach(pkg => packageByKey.set(pkg.key, pkg));

        const studioPackageWithDataModelVariableAssignments = await variableService.getVariableAssignmentsForNodes(PackageManagerVariableType.DATA_MODEL);
        const dataModelDetailsByNode = await dataModelService.getDataModelDetailsForPackages(studioPackageWithDataModelVariableAssignments);
        studioPackageWithDataModelVariableAssignments.forEach(studioPackage => {
            if (packageByKey.has(studioPackage.key)) {
                packageByKey.get(studioPackage.key).datamodels = dataModelDetailsByNode.get(studioPackage.key);
            }
        });
    }
}

export const studioService = new StudioService();