import {ManagerConfig} from "../../interfaces/manager-config.interface";
import {BaseManager} from "./base.manager";
import * as fs from "fs";
import {logger} from "../../util/logger";
import {
    DependenciesTransport,
    PackageWithVariableAssignments,
    SaveContentNode,
    VariablesAssignments
} from "../../interfaces/save-content-node.interface";
import {v4 as uuidv4} from "uuid";
import {AssetManager} from "./asset.manager";

export class PackageManager extends BaseManager {
    public static PACKAGE_FILE_PREFIX = "package_";
    public static PACKAGE_FILE_EXTENSION = ".zip";

    private static BASE_URL = "/package-manager/api/packages";
    private static FIND_ALL_WITH_VARIABLES = "/package-manager/api/packages/with-variable-assignments";
    private static FIND_ALL_NODES = "/package-manager/api/nodes";

    private static IMPORT_ENDPOINT_PATH = "import";
    private static EXPORT_ENDPOINT_PATH = "export";

    private _key: string;
    private _spaceKey: string;
    private _fileName: string;
    private _store: boolean;
    private _newKey: string;
    private _overwrite: boolean;
    private _draft: boolean;
    private _responseType: string;
    private _includeDependencies: boolean;

    public get key(): string {
        return this._key;
    }

    public set key(value: string) {
        this._key = value;
    }

    public get spaceKey(): string {
        return this._spaceKey;
    }

    public set spaceKey(value: string) {
        this._spaceKey = value;
    }

    public get fileName(): string {
        return this._fileName;
    }

    public set fileName(value: string) {
        this._fileName = value;
    }

    public get store(): boolean {
        return this._store;
    }

    public set store(value: boolean) {
        this._store = value;
    }

    public get newKey(): string {
        return this._newKey;
    }

    public set newKey(value: string) {
        this._newKey = value;
    }

    public get overwrite(): boolean {
        return this._overwrite;
    }

    public set overwrite(value: boolean) {
        this._overwrite = value;
    }

    public get draft(): boolean {
        return this._draft;
    }

    public set draft(value: boolean) {
        this._draft = value;
    }

    public get responseType(): string {
        return this._responseType;
    }

    public set responseType(value: string) {
        this._responseType = value;
    }

    public get includeDependencies(): boolean {
        return this._includeDependencies;
    }

    public set includeDependencies(value: boolean) {
        this._includeDependencies = value;
    }

    public getConfig(): ManagerConfig {
        return {
            pushUrl: this.profile.team.replace(/\/?$/, this.buildPushUrl()),
            pullUrl: this.profile.team.replace(
                /\/?$/,
                `${PackageManager.BASE_URL}/${this.key}/${PackageManager.EXPORT_ENDPOINT_PATH}?store=${
                    this.store
                }&draft=${this.draft}${this.newKey ? `&newKey=${this.newKey}` : ""}`
            ),
            findAllUrl: this.profile.team.replace(/\/?$/, PackageManager.BASE_URL),
            exportFileName:
                PackageManager.PACKAGE_FILE_PREFIX +
                (this.newKey ? this.newKey : this.key) +
                PackageManager.PACKAGE_FILE_EXTENSION,
            onPushSuccessMessage: (): string => "Package was pushed successfully.",
            onFindAll: (data: SaveContentNode[]) => this.listPackages(data),
            onFindAllAndExport: async (data: SaveContentNode[]) => this.exportListOfPackages(data),
        };
    }

    public getBody(): any {
        return {
            formData: {
                package: fs.createReadStream(this.fileName),
            },
        };
    }

    protected getSerializedFileContent(data: any): string {
        return data;
    }

    private findAllDependenciesUrl(node: SaveContentNode): string {
        return `/package-manager/api/package-dependencies/${node.id}/by-root-draft-id/${node.workingDraftId}`;
    }

    private buildPushUrl(): string {
        this.validateOptions();
        const pushUrl = `${PackageManager.BASE_URL}/${PackageManager.IMPORT_ENDPOINT_PATH}`;
        return this.getPushUrlWithParams(pushUrl);
    }

    private listPackages(nodes: SaveContentNode[]): void {
        nodes.forEach(node => {
            logger.info(`${node.name} - Key: "${node.key}"`);
        });
    }

    private async exportListOfPackages(nodes: SaveContentNode[]): Promise<void> {
        return new Promise<void>(async resolve => {
            const fieldsToInclude = ["key", "name", "changeDate", "activatedDraftId", "spaceId"];

            if (this.includeDependencies) {
                fieldsToInclude.push("variables", "type", "value", "dependencies", "id", "version");

                const packagesKeyWithActionFlows = (await this.findAllNodesOfType("SCENARIO")).map(node => node.rootNodeKey);
                nodes = nodes.filter(node => {
                    return !packagesKeyWithActionFlows.includes(node.rootNodeKey);
                })

                const variablesByNodeKey = await this.getVariablesByNodeKey();
                nodes.map(node => {
                        node.variables = variablesByNodeKey.get(node.key);
                        return node;
                    }
                )

                nodes = await this.getPackagesWithDependencies(nodes);

                const filename = uuidv4() + ".json";
                this.writeToFileWithGivenName(JSON.stringify(nodes, fieldsToInclude), filename);
                logger.info(this.fileDownloadedMessage + filename);
                resolve();
            } else {
                const filename = uuidv4() + ".json";
                this.writeToFileWithGivenName(JSON.stringify(nodes, fieldsToInclude), filename);
                logger.info(this.fileDownloadedMessage + filename);
                resolve();
            }
        })
    }

    private async getVariablesByNodeKey(): Promise<Map<string, VariablesAssignments[]>> {
        const nodeWithVariablesAssignments = await this.get(PackageManager.FIND_ALL_WITH_VARIABLES);
        const variablesByNodeKey = new Map<string, VariablesAssignments[]>();

        nodeWithVariablesAssignments.forEach(nodeWithVariablesAssignment => {
            variablesByNodeKey.set(nodeWithVariablesAssignment.key, nodeWithVariablesAssignment.variableAssignments);
        })
        return variablesByNodeKey;
    }

    private async getPackagesWithDependencies(nodes: SaveContentNode[]): Promise<SaveContentNode[]> {
        return new Promise(async resolve => {
            resolve(await Promise.all(nodes.map(async node => {
                node.dependencies = await this.get(this.findAllDependenciesUrl(node));
                return node;
            })))
        })
    }


    private validateOptions(): void {
        if (this.newKey && this.overwrite) {
            logger.error(
                "You cannot overwrite a package and set a new key at the same time. Please use only one of the options."
            );
            process.exit();
        }
    }

    private getPushUrlWithParams(pushUrl: string): string {
        const pushUrlWithParams = `${pushUrl}?spaceId=${this.spaceKey}&`;
        if (this.newKey) {
            return `${pushUrlWithParams}newKey=${this.newKey}`;
        }
        if (this.overwrite) {
            return `${pushUrlWithParams}overwrite=${this.overwrite}`;
        }
        return pushUrlWithParams;
    }

    private async findAllNodesOfType(assetType?: string): Promise<any[]> {
        return this.get(PackageManager.FIND_ALL_NODES+`?assetType=${assetType}`)
    }
}
