import {PackageExportTransport} from "../../interfaces/package-export-transport";
import {packageApi} from "../../api/package-api";
import {PackageManagerVariableType, PackageWithVariableAssignments} from "../../interfaces/package-manager.interfaces";
import {dataModelService} from "../package-manager/datamodel-service";

class StudioService {

    public async getExportPackagesWithStudioData(packagesToExport: PackageExportTransport[], withDependencies: boolean) {
        const studioPackagesWithDataModels = await packageApi.findAllPackagesWithVariableAssignments(PackageManagerVariableType.DATA_MODEL);

        await studioService.setSpaceIdForStudioPackages(packagesToExport, studioPackagesWithDataModels);

        if (withDependencies) {
            await studioService.setDataModelsForStudioPackages(packagesToExport, studioPackagesWithDataModels);
        }

        return packagesToExport;
    }

    private async setSpaceIdForStudioPackages(packages: PackageExportTransport[], studioPackages: PackageWithVariableAssignments[]): Promise<void> {
        const packageByKey = new Map<string, PackageExportTransport>();
        packages.forEach(pkg => packageByKey.set(pkg.key, pkg));

        studioPackages.forEach(studioPackage => {
            if (packageByKey.has(studioPackage.key)) {
                packageByKey.get(studioPackage.key).spaceId = studioPackage.spaceId;
            }
        });
    }

    private async setDataModelsForStudioPackages(packages: PackageExportTransport[], studioPackageWithDataModels: PackageWithVariableAssignments[]): Promise<void> {
        const packageByKey = new Map<string, PackageExportTransport>();
        packages.forEach(pkg => packageByKey.set(pkg.key, pkg));

        const dataModelDetailsByNode = await dataModelService.getDataModelDetailsForPackages(studioPackageWithDataModels);
        studioPackageWithDataModels.forEach(studioPackage => {
            if (packageByKey.has(studioPackage.key)) {
                packageByKey.get(studioPackage.key).datamodels = dataModelDetailsByNode.get(studioPackage.key)
                    .map(dataModel => ({
                        name: dataModel.name,
                        poolId: dataModel.poolId,
                        dataModelId: dataModel.dataModelId
                    }));
            }
        });
    }
}

export const studioService = new StudioService();