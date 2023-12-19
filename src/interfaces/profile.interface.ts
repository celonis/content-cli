export interface Profile {
    name: string;
    team: string;
    type: ProfileType;
    apiToken: string;
    authenticationType: AuthenticationType;
    clientId: string;
    clientSecret: string;
}

export type AuthenticationType = "Bearer" | "AppKey";
export type ProfileType = "OAuth" | "Key";
// tslint:disable-next-line:variable-name
export const AuthenticationType: { [key: string]: AuthenticationType } = {
    BEARER: "Bearer",
    APPKEY: "AppKey",
};
