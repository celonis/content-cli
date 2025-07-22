export interface VcsProfile {
    name: string;
    username?: string;
    repository: string; // in the format "owner/repository"
    token?: string;
    authenticationType: AuthenticationType;
    vcsType: VcsType;
}

export type AuthenticationType = "SSH" | "Personal Access Token";
export type VcsType = "GIT";

// tslint:disable-next-line:variable-name
export const AuthenticationType: { [key: string]: AuthenticationType } = {
    SSH: "SSH",
    PAT: "Personal Access Token",
};

// tslint:disable-next-line:variable-name
export const VcsType: { [key: string]: VcsType } = {
    GIT: "GIT",
};
