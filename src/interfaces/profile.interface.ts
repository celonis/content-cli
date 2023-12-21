export interface Profile {
    name: string;
    team: string;
    type: ProfileType;
    apiToken: string;
    authenticationType: AuthenticationType;
    clientId?: string;
    clientSecret?: string;
    clientAuthenticationMethod?: ClientAuthenticationMethod;
    refreshToken?: string;
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
