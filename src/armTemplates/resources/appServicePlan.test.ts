import { AppServicePlanResource } from "./appServicePlan";
import { ServerlessAzureConfig, FunctionAppOS } from "../../models/serverless";
import md5 from "md5";
import configConstants from "../../config";

describe("App Service Plan Resource", () => {
  const resourceGroupName = "myResourceGroup";
  const prefix = "prefix";
  const region = "eastus2";
  const stage = "prod";

  const defaultConfig: ServerlessAzureConfig = {
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

  it("generates the correct resource name", () => {
    const resourceGroupHash = md5(resourceGroupName).substr(
      0,
      configConstants.resourceGroupHashLength
    );

    const config: ServerlessAzureConfig = {
      ...defaultConfig
    };

    expect(AppServicePlanResource.getResourceName(config)).toEqual(
      `${prefix}-eus2-${stage}-${resourceGroupHash}-asp`
    );
  });

  it("uses the specified name from the azure provider", () => {
    const appServicePlanName = "myAppServicePlan";

    const config: ServerlessAzureConfig = {
      ...defaultConfig,
      provider: {
        ...defaultConfig.provider,
        appServicePlan: {
          name: appServicePlanName,
        },
      },
    };

    expect(AppServicePlanResource.getResourceName(config)).toEqual(appServicePlanName);
  });

  it("gets the correct Linux pararameters", () => {
    const config: ServerlessAzureConfig = {
      ...defaultConfig,
      provider: {
        ...defaultConfig.provider,
        os: FunctionAppOS.LINUX
      }
    }

    const resource = new AppServicePlanResource();
    const params = resource.getParameters(config);
    expect(params.kind.value).toEqual("Linux");
  });
});
