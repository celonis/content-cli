export interface ManagerConfig {
    pushUrl: string;
    pullUrl: string;
    updateUrl?: string;
    exportFileName: string;
    onPushSuccessMessage: (data: any) => string;
    onUpdateSuccessMessage?: () => string;
}
