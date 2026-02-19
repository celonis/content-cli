export interface PackageVersionTransport {
  packageKey: string;
  historyId: string;
  version: string;
  changeDate: string;
  publishDate: string;
  publishMessage: string;
  deployed: boolean;
  publishedBy: string;
}
