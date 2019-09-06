import { FunctionAppResource } from "./functionApp";
import { ServerlessAzureConfig } from "../../models/serverless";

describe("Function App Resource", () => {
  const resourceGroupName = "myResourceGroup";
  const prefix = "prefix";
  const region = "westus";
  const stage = "prod";

  it("generates the correct resource name", () => {
    const config: ServerlessAzureConfig = {
      provider: {
        name: "azure",
        prefix,
        region,
        stage,
        resourceGroup: resourceGroupName,
        runtime: "nodejs10.x"
      },
      service: ""
    } as any;

    expect(FunctionAppResource.getResourceName(config)).toEqual(
      `${config.provider.prefix}-wus-${config.provider.stage}`
    );
  });

  it("uses the specified name from the azure provider", () => {
    const serviceName = "myapp";

    const config: ServerlessAzureConfig = {
      provider: {
        apim: {
          name: ""
        },
        name: "azure",
        prefix,
        region,
        stage,
        resourceGroup: resourceGroupName,
        runtime: "nodejs10.x",
        functionApp: {
          name: serviceName,
        },
      },
      service: serviceName
    } as any;

    expect(FunctionAppResource.getResourceName(config)).toEqual(serviceName);
  });
});
