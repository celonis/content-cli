import {TokenSet} from "openid-client";

export interface Profile {
    name: string;
    team: string;
    type: ProfileType;
    apiToken: string;
    authenticationType: AuthenticationType;
    tokenSet: TokenSet;
}

export type AuthenticationType = "Bearer" | "AppKey";
export type ProfileType = "Device Code" | "Key";
// tslint:disable-next-line:variable-name
export const AuthenticationType: { [key: string]: AuthenticationType } = {
    BEARER: "Bearer",
    APPKEY: "AppKey",
};
