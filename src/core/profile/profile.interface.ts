export interface ProfileSecrets {
    apiToken: string;
    clientSecret?: string;
    refreshToken?: string;
    secretsStoredSecurely?: boolean;
}

export interface Profile extends ProfileSecrets{
    name: string;
    team: string;
    type: ProfileType;
    authenticationType: AuthenticationType;
    clientId?: string;
    scopes?: string[];
    clientAuthenticationMethod?: ClientAuthenticationMethod;
    expiresAt?: number;
}

export type AuthenticationType = "Bearer" | "AppKey";
export type ProfileType = "Device Code" | "Client Credentials" | "Key";

export type ClientAuthenticationMethod = "client_secret_basic" | "client_secret_post";
// tslint:disable-next-line:variable-name
export const AuthenticationType: { [key: string]: AuthenticationType } = {
    BEARER: "Bearer",
    APPKEY: "AppKey",
};
// tslint:disable-next-line:variable-name
export const ProfileType: { [key: string]: ProfileType } = {
    DEVICE_CODE: "Device Code",
    CLIENT_CREDENTIALS: "Client Credentials",
    KEY: "Key"
};
// tslint:disable-next-line:variable-name
export const ClientAuthenticationMethod: { [key: string]: ClientAuthenticationMethod } = {
    CLIENT_SECRET_BASIC: "client_secret_basic",
    CLIENT_SECRET_POST: "client_secret_post",
};
