import {contextService} from "../../src/services/context.service";

export function setDefaultProfile(): void {
    contextService.setContext({
        profile: {
            name: "test",
            type: "Key",
            team: "https://myTeam.celonis.cloud/",
            apiToken: "YnQ3N2M0M2ItYzQ3OS00YzgyLTg0ODgtOWNkNzhiNzYwOTU2OlFkNnBpVCs0M0JBYm1ZWGlCZ2hPd245aldwWTNubFQyYVFOTFBUeHEwdUxM",
            authenticationType: "Bearer"
        }
    });
}
