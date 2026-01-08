import * as keytar from "keytar";
import { Profile, ProfileSecrets } from "./profile.interface";
import { logger } from "../utils/logger";

enum PROFILE_SECRET_TYPE {
    API_TOKEN = "apiToken",
    CLIENT_SECRET = "clientSecret",
    REFRESH_TOKEN = "refreshToken",
}

const CONTENT_CLI_SERVICE_NAME = "celonis-content-cli";

export class SecureSecretStorageService {

    public async storeSecrets(profile: Profile): Promise<boolean> {
        let secretsStoredInKeychain = true;
        const secretEntries = [
            { type: PROFILE_SECRET_TYPE.API_TOKEN, value: profile.apiToken },
            { type: PROFILE_SECRET_TYPE.CLIENT_SECRET, value: profile.clientSecret },
            { type: PROFILE_SECRET_TYPE.REFRESH_TOKEN, value: profile.refreshToken },
        ];

        for (const secretEntry of secretEntries) {
            if (secretEntry.value) {
                const stored = await this.storeSecret(
                    this.getSecretServiceName(profile.name),
                    secretEntry.type,
                    secretEntry.value
                );
                if (!stored) {
                    secretsStoredInKeychain = false;
                }
            }
        }

        if (!secretsStoredInKeychain) {
            logger.warn("⚠️ Failed to store secrets securely. They will be stored in plain text file.");
            return false;
        }

        return true;
    }

    public async getSecrets(profileName: string): Promise<ProfileSecrets | undefined> {
        const secrets = await keytar.findCredentials(this.getSecretServiceName(profileName));

        if (!secrets.length) {
            logger.warn("⚠️ Profile secrets are stored as plain-text insecurely. Consider re-creating the profile to save the secrets securely.");
            return undefined;
        }

        const profileSecrets = {};

        for (const secret of secrets) {
            profileSecrets[secret.account] = secret.password
        }

        return profileSecrets as ProfileSecrets;
    }

    private getSecretServiceName(profileName: string): string {
        return `${CONTENT_CLI_SERVICE_NAME}:${profileName}`;
    }

    private async storeSecret(service: string, account: string, secret: string): Promise<boolean> {
        try {
            await keytar.setPassword(service, account, secret);
            return true;
        } catch (error) {
            return false;
        }
    }
}

export const secureSecretStorageService = new SecureSecretStorageService();