import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import mockFs from "mock-fs";
import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { InvokeService } from "./invokeService";
import { Site } from "@azure/arm-appservice/esm/models";

jest.mock("@azure/arm-appservice")
import { WebSiteManagementClient } from "@azure/arm-appservice";
jest.mock("@azure/arm-resources")

describe("Invoke Service ", () => {
  const app = MockFactory.createTestSite();
  const slsService = MockFactory.createTestService();
  const variables = MockFactory.createTestVariables();
  const provider = MockFactory.createTestAzureServiceProvider();
  const functionName = "test";
  const authKey = "authKey";
  const baseUrl = "https://management.azure.com"
  const masterKeyUrl = `https://${app.defaultHostName}/admin/host/systemkeys/_master`;
  const authKeyUrl = `${baseUrl}${app.id}/functions/admin/token?api-version=2016-08-01`;
  let functionApp: Site;
  let masterKey: string;

  beforeAll(() => {

    const axiosMock = new MockAdapter(axios);
    
    // Master Key
    axiosMock.onGet(masterKeyUrl).reply(200, { value: masterKey });
    // Auth Key
    axiosMock.onGet(authKeyUrl).reply(200, authKey);
  });

  it("Invokes a function", async () => {
    const sls = MockFactory.createTestServerless();
    const options = MockFactory.createTestServerlessOptions();
    options["function"] = "hello";
    options["data"] = '{"name": "AzureTest"}';
    options["method"] = "GET";

    const service = new InvokeService(sls, options);
    const response = await service.invoke(options["function"], options["data"], options["method"]);

    expect().toEqual(response.data)
   });
});