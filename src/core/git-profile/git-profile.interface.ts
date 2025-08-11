export interface GitProfile {
    name: string;
    username?: string;
    repository: string; // in the format "owner/repository"
    token?: string;
    authenticationType: AuthenticationType;
}

export type AuthenticationType = "SSH" | "Personal Access Token";

// tslint:disable-next-line:variable-name
export const AuthenticationType: { [key: string]: AuthenticationType } = {
    SSH: "SSH",
    PAT: "Personal Access Token",
};
