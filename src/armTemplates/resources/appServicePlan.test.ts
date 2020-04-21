import { AppServicePlanResource } from "./appServicePlan";
import { ServerlessAzureConfig } from "../../models/serverless";
import md5 from "md5";
import { configConstants } from "../../config/constants";
import { Runtime, FunctionAppOS } from "../../config/runtime";

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
      runtime: Runtime.NODE10,
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

  it("generates correct default parameters", () => {
    const config: ServerlessAzureConfig = {
      provider: {
        name: "azure",
        prefix,
        region,
        stage,
        resourceGroup: resourceGroupName,
        runtime: Runtime.NODE10,
      },
      plugins: [],
      functions: {},
      service: "myapp",
    };

    const appServicePlanResource = new AppServicePlanResource();
    const params = appServicePlanResource.getParameters(config);

    expect(Object.keys(params)).toHaveLength(9);
    expect(params.appServicePlanName.value).toEqual(AppServicePlanResource.getResourceName(config));
    expect(params.appServicePlanSkuName.value).toBeUndefined();
    expect(params.appServicePlanSkuTier.value).toBeUndefined();
    expect(params.appServicePlanWorkerSizeId.value).toBeUndefined();
    expect(params.appServicePlanMinWorkerCount.value).toBeUndefined();
    expect(params.appServicePlanMaxWorkerCount.value).toBeUndefined();
    expect(params.appServicePlanHostingEnvironment.value).toBeUndefined();
    expect(params.appServicePlanReserved.value).toBeUndefined();
  });

  it("generates correct default parameters with linux function app", () => {
    const config: ServerlessAzureConfig = {
      provider: {
        name: "azure",
        prefix,
        region,
        stage,
        resourceGroup: resourceGroupName,
        runtime: Runtime.NODE10,
        os: FunctionAppOS.LINUX,
      },
      plugins: [],
      functions: {},
      service: "myapp",
    };

    const appServicePlanResource = new AppServicePlanResource();
    const params = appServicePlanResource.getParameters(config);

    expect(Object.keys(params)).toHaveLength(9);
    expect(params.appServicePlanName.value).toEqual(AppServicePlanResource.getResourceName(config));
    expect(params.appServicePlanSkuName.value).toBeUndefined();
    expect(params.appServicePlanSkuTier.value).toBeUndefined();
    expect(params.appServicePlanWorkerSizeId.value).toBeUndefined();
    expect(params.appServicePlanMinWorkerCount.value).toBeUndefined();
    expect(params.appServicePlanMaxWorkerCount.value).toBeUndefined();
    expect(params.appServicePlanHostingEnvironment.value).toBeUndefined();
    expect(params.appServicePlanReserved.value).toBe(true);
  });

  it("generates correct specified parameters", () => {
    const config: ServerlessAzureConfig = {
      provider: {
        name: "azure",
        prefix,
        region,
        stage,
        resourceGroup: resourceGroupName,
        runtime: Runtime.NODE10,
        appServicePlan: {
          name: "customAppServicePlanName",
          hostingEnvironment: "customHostingEnvironment",
          sku: {
            name: "EP2",
            tier: "specialTier"
          },
          scale: {
            minWorkerCount: 3,
            maxWorkerCount: 20,
            workerSizeId: "4"
          }
        }
      },
      plugins: [],
      functions: {},
      service: "myapp",
    };

    const appServicePlanResource = new AppServicePlanResource();
    const params = appServicePlanResource.getParameters(config);

    expect(Object.keys(params)).toHaveLength(9);
    expect(params.appServicePlanName.value).toEqual(config.provider.appServicePlan.name);
    expect(params.appServicePlanSkuName.value).toEqual(config.provider.appServicePlan.sku.name);
    expect(params.appServicePlanSkuTier.value).toEqual(config.provider.appServicePlan.sku.tier);
    expect(params.appServicePlanWorkerSizeId.value).toEqual(config.provider.appServicePlan.scale.workerSizeId);
    expect(params.appServicePlanMinWorkerCount.value).toEqual(config.provider.appServicePlan.scale.minWorkerCount);
    expect(params.appServicePlanMaxWorkerCount.value).toEqual(config.provider.appServicePlan.scale.maxWorkerCount);
    expect(params.appServicePlanHostingEnvironment.value).toEqual(config.provider.appServicePlan.hostingEnvironment);
    expect(params.appServicePlanReserved.value).toBeUndefined();
  });

  it("generates the expected template", () => {
    const appServicePlanResource = new AppServicePlanResource();
    const template = appServicePlanResource.getTemplate();
    const appServicePlan = template.resources[0];

    expect(appServicePlan).toMatchObject({
      name: "[parameters('appServicePlanName')]",
      type: "Microsoft.Web/serverfarms",
      location: "[parameters('location')]",
      properties: {
        name: "[parameters('appServicePlanName')]",
        workerSizeId: "[parameters('appServicePlanWorkerSizeId')]",
        numberOfWorkers: "[parameters('appServicePlanMinWorkerCount')]",
        maximumElasticWorkerCount: "[parameters('appServicePlanMaxWorkerCount')]",
        hostingEnvironment: "[parameters('appServicePlanHostingEnvironment')]",
      },
      sku: {
        name: "[parameters('appServicePlanSkuName')]",
        tier: "[parameters('appServicePlanSkuTier')]"
      }
    });
  });

  it("gets the correct Linux parameters", () => {
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
