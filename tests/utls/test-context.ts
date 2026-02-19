import {Context} from "../../src/core/command/cli-context";
import {HttpClient} from "../../src/core/http/http-client";

const testContext = new Context({});
testContext.profile = {
    name: "test",
    type: "Key",
    team: "https://myTeam.celonis.cloud/",
    apiToken: "test-token",
    authenticationType: "Bearer",
};
testContext._httpClient = new HttpClient(testContext);
export {testContext};
