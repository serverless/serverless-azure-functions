import { ServerlessAzureConfig } from "../../models/serverless";
import { FunctionAppResource } from "./functionApp";

describe("Function App Resource", () => {
  const resourceGroupName = "myResourceGroup";
  const prefix = "prefix";
  const region = "westus";
  const stage = "prod";

  it("generates the correct resource name", () => {
    const config = {
      provider: {
        name: "azure",
        prefix,
        region,
        stage,
        resourceGroup: resourceGroupName,
        runtime: "nodejs10.x"
      },
      service: ""
    } as ServerlessAzureConfig;

    expect(FunctionAppResource.getResourceName(config)).toEqual(
      `${config.provider.prefix}-wus-${config.provider.stage}`
    );
  });

  it("uses the specified name from the azure provider", () => {
    const serviceName = "myapp";

    const config = {
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
          name: serviceName
        },
      },
      service: serviceName
    } as ServerlessAzureConfig;

    expect(FunctionAppResource.getResourceName(config)).toEqual(serviceName);
  });

  it.each([
      ['staging', 'staging', `${prefix}-wus-${stage}-staging`],
      ['staging', 'production', `${prefix}-wus-${stage}`],
      ['canary', 'canary', `${prefix}-wus-${stage}-canary`],
      ['canary', 'production', `${prefix}-wus-${stage}`],
      ['prod', 'prod', `${prefix}-wus-${stage}`],
      ['production', 'production', `${prefix}-wus-${stage}`],
      ['', '', `${prefix}-wus-${stage}`],
      [null, null, `${prefix}-wus-${stage}`]
  ])(`given slot name: %s, expect resource name: %s`, (slotName: string, deploymentSlot: string, expectedResourceName: string) => {
    const config = {
      provider: {
        name: "azure",
        prefix,
        region,
        stage,
        resourceGroup: resourceGroupName,
        runtime: "nodejs10.x",
        deployment: {
          slot: deploymentSlot
        },
        functionApp: {
          slot: slotName
        }
      },
      service: ""
    } as ServerlessAzureConfig;

    expect(FunctionAppResource.getResourceName(config, deploymentSlot)).toEqual(expectedResourceName);
  });

  it.each([
      ['staging', `staging`],
      ['canary', `canary`],
      ['prod', `prod`],
      ['production', `production`],
      ['a b', `a-b`],
      ['', null],
      [null, null]
  ])(`given slot name: %s, expect slot: %s`, (slotName: string, expectedSlot: string) => {
    const config = {
      provider: {
        name: "azure",
        prefix,
        region,
        stage,
        resourceGroup: resourceGroupName,
        runtime: "nodejs10.x",
        deployment: {
          slot: 'doesnotexist'
        },
        functionApp: {
          slot: slotName
        }
      },
      service: ""
    } as ServerlessAzureConfig;

    expect(FunctionAppResource.getFunctionSlot(config)).toEqual(expectedSlot);
  });
});
