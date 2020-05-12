import { VirtualNetworkResource } from "./virtualNetwork";
import { ServerlessAzureConfig } from "../../models/serverless";
import md5 from "md5";
import { constants } from "../../shared/constants";
import { Runtime } from "../../config/runtime";

describe("Virtual Network Resource", () => {
  const resourceGroupName = "myResourceGroup";
  const prefix = "prefix";
  const region = "eastus2";
  const stage = "prod";

  it("generates the correct resource name", () => {
    const resourceGroupHash = md5(resourceGroupName).substr(
      0,
      constants.resourceGroupHashLength
    );

    const config: ServerlessAzureConfig = {
      provider: {
        name: "azure",
        prefix,
        region,
        stage,
        resourceGroup: resourceGroupName,
        runtime: Runtime.NODE10
      },
      service: ""
    } as any;

    expect(VirtualNetworkResource.getResourceName(config)).toEqual(
      `${prefix}-eus2-${stage}-${resourceGroupHash}-vnet`
    );
  });

  it("uses the specified name from the azure provider", () => {
    const virtualNetworkName = "myVNET";

    const config: ServerlessAzureConfig = {
      provider: {
        hostingEnvironment: {
          name: virtualNetworkName
        },
        name: "azure",
        prefix,
        region,
        stage,
        resourceGroup: resourceGroupName,
        runtime: Runtime.NODE10
      },
      service: ""
    } as any;

    expect(VirtualNetworkResource.getResourceName(config)).toEqual(virtualNetworkName);
  });
});
