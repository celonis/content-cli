export interface BookmarkEntry {
    assetKey: string;
    assetType: string;
    bookmark: BookmarkDetails;
    preference: BookmarkPreference;
}

export interface BookmarkDetails {
    name: string;
    ownerId: string;
    sharedByLink: boolean;
    published: boolean;
}

export interface BookmarkPreference {
    configuration: string;
    shareable: boolean;
    mode: string;
    userId: string;
}

export interface BookmarksExport {
    packageKey: string;
    entries: BookmarkEntry[];
}

export interface BookmarksImportRequest {
    entries: BookmarkEntry[];
}

export interface BookmarksImportResultEntry {
    assetKey: string;
    status: string;
    reason: string | null;
}

export interface BookmarksImportResult {
    packageKey: string;
    entries: BookmarksImportResultEntry[];
}
