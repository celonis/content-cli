export interface GitProfile {
    name: string;
    username?: string;
    repository: string; // in the format "owner/repository"
    authenticationType: AuthenticationType;
}

export type AuthenticationType = "SSH" | "HTTPS";

// tslint:disable-next-line:variable-name
export const AuthenticationType: { [key: string]: AuthenticationType } = {
    SSH: "SSH",
    HTTPS: "HTTPS",
};
