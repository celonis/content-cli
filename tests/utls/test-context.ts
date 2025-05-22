import { Context } from "../../src/core/command/cli-context";
import { HttpClient } from "../../src/core/http/http-client";

const testContext = new Context({});
testContext.profile = {
    name: "test",
    type: "Key",
    team: "https://myTeam.celonis.cloud/",
    apiToken: "YnQ3N2M0M2ItYzQ3OS00YzgyLTg0ODgtOWNkNzhiNzYwOTU2OlFkNnBpVCs0M0JBYm1ZWGlCZ2hPd245aldwWTNubFQyYVFOTFBUeHEwdUxM",
    authenticationType: "Bearer"
}
testContext.httpClient = new HttpClient(testContext);
export { testContext };
