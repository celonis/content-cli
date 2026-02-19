export interface ManagerConfig {
  pushUrl?: string;
  pullUrl?: string;
  updateUrl?: string;
  findAllUrl?: string;
  exportFileName?: string;
  onPushSuccessMessage?: (data: any) => string;
  onUpdateSuccessMessage?: () => string;
  onFindAll?: (data: any) => void;
  onFindAllAndExport?: (data: any) => void;
}
