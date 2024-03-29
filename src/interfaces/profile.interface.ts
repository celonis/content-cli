export interface Profile {
    name: string;
    team: string;
    apiToken: string;
    authenticationType: AuthenticationType;
}

export type AuthenticationType = "Bearer" | "AppKey";
// tslint:disable-next-line:variable-name
export const AuthenticationType: { [key: string]: AuthenticationType } = {
    BEARER: "Bearer",
    APPKEY: "AppKey",
};
