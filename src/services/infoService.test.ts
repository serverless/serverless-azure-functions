import Serverless from "serverless";
import { ArmDeployment } from "../models/armTemplates";
import { AzureResourceInfo } from "../models/serverless";
import { MockFactory } from "../test/mockFactory";
import { AzureInfoService, ServiceInfoType } from "./infoService";

jest.mock("./armService");
import { ArmService } from "./armService";

jest.mock("./resourceService");
import { ResourceService } from "./resourceService";

jest.mock("./functionAppService");
import { FunctionAppService } from "./functionAppService";

describe("Info Service", () => {

  function createService(sls?: Serverless, options?: any, ) {
    return new AzureInfoService(sls || MockFactory.createTestServerless(), options || {});
  }

  const resourceName1 = "My First Resource Name";
  const resourceLocation1 = "West US 2";
  const resourceType1 = "Type1";
  
  const resourceName2 = "My Second Resource Name";
  const resourceLocation2 = "West US";
  const resourceType2 = "Type2"

  const resourceName3 = "My Third Resource Name";
  const resourceLocation3 = "East US";
  const resourceType3 = "Type3";
  
  const expectedResources: AzureResourceInfo[] = [
    {
      name: resourceName1,
      resourceType: resourceType1,
      region: resourceLocation1,
    },
    {
      name: resourceName2,
      resourceType: resourceType2,
      region: resourceLocation2,
    },
    {
      name: resourceName3,
      resourceType: resourceType3,
      region: resourceLocation3,
    },
  ]

  describe("Dry Run", () => {
    const sls = MockFactory.createTestServerless();
    const resourceGroupName = "My Resource Group";
    const functionAppName = "My Function App Name";

    sls.service.provider = {
      ...sls.service.provider,
      resourceGroup: resourceGroupName,
      functionApp: {
        name: functionAppName
      }
    } as any;

    const service = createService(sls);
    const verbose = createService(sls, {"arm": ""});
    
    const defaultArmDeployment: ArmDeployment = {
      parameters: {
        resourceName1: {
          defaultValue: resourceName1,
        },
        resourceLocation1: {
          value: resourceLocation1,
        },
        resourceType1: {
          value: resourceType1
        },
        resourceLocation2: {
          defaultValue: resourceLocation2,
        },
        resourceName3: {
          value: resourceName3,
        },
      },
      template: {
        resources: [
          {
            name: "[parameters('resourceName1')]",
            location: "[parameters('resourceLocation1')]",
            type: resourceType1,
          },
          {
            name: resourceName2,
            location: "[parameters('resourceLocation2')]",
            type: resourceType2,
          },
          {
            name: "[parameters('resourceName3')]",
            location: resourceLocation3,
            type: resourceType3,
          },
        ]
      } as any
    }

    beforeAll(() => {
      ArmService.prototype.createDeploymentFromType = jest.fn(() => Promise.resolve(defaultArmDeployment));

    });

    it("gets dry-run info by default", async () => {
      expect((await service.getInfo()).isDryRun).toBe(true);
      expect((await service.getInfo(ServiceInfoType.DRYRUN)).isDryRun).toBe(true);
    });

    it("gets correct service service info", async () => {
      const { resourceGroup, functionApp, resources } = await service.getInfo();
      expect(resourceGroup).toEqual(resourceGroupName);
      expect(functionApp.name).toEqual(functionAppName);
      expect(resources).toEqual(expectedResources);
      expect(functionApp.functions).toEqual(["hello", "goodbye"]);
    });    

    it("prints summary", async () => {
      await service.printInfo();
      expect(sls.cli.log).lastCalledWith([
        `\nResource Group Name: ${resourceGroupName}`,
        `Function App Name: ${functionAppName}`,
        "Functions:",
        "\t" + ["hello", "goodbye"].join("\n\t"),
        "Azure Resources:",
        expectedResources.map((r) => JSON.stringify(r, null, 2)).join(",\n")
      ].join("\n"));
    });
  
    it("prints arm template", async () => {
      await verbose.printInfo();
      expect(sls.cli.log).lastCalledWith(JSON.stringify(defaultArmDeployment, null, 2));
    });
  });

  describe("Deployed", () => {
    const sls = MockFactory.createTestServerless();
    const resourceGroupName = "My Resource Group";
    const functionAppName = "My Function App Name";

    sls.service.provider = {
      ...sls.service.provider,
      resourceGroup: resourceGroupName,
    } as any;

    const service = createService(sls);
    const verbose = createService(sls, {"arm": ""});

    const mockResourceGroup = {
      name: resourceGroupName,
    }

    const listOfFunctions = [
      { name: "function1" },
      { name: "function2" },
      { name: "function3" }
    ]

    const previouDeploymentTemplate = {
      $schema: {},
      resources: []
    }

    beforeAll(() => {
      FunctionAppService.prototype.get = jest.fn(() => Promise.resolve({
        name: functionAppName 
      })) as any;
      FunctionAppService.prototype.listFunctions = jest.fn(() => Promise.resolve(listOfFunctions)) as any;
      ResourceService.prototype.getPreviousDeploymentTemplate = jest.fn(() => Promise.resolve(previouDeploymentTemplate)) as any;
    })

    it("advises user if resource group is not deployed", async () => {
      ResourceService.prototype.getResourceGroup = jest.fn(() => Promise.resolve(undefined));
      await service.getInfo(ServiceInfoType.DEPLOYED);
      expect(sls.cli.log).lastCalledWith(`Resource group ${resourceGroupName} is not yet deployed`);
    });

    it("advises user if resource group has no resources", async () => {
      ResourceService.prototype.getResourceGroup = jest.fn(() => Promise.resolve(mockResourceGroup)) as any;
      ResourceService.prototype.getResources = jest.fn(() => Promise.resolve([])) as any;
      await service.getInfo(ServiceInfoType.DEPLOYED);
      expect(sls.cli.log).lastCalledWith(`Resource group ${resourceGroupName} has no resources`);
    });

    it("gets correct service info", async () => {
      const resourceName1 = "My First Resource Name";
      const resourceLocation1 = "West US 2";
      const resourceType1 = "Type1";
      
      const resourceName2 = "My Second Resource Name";
      const resourceLocation2 = "West US";
      const resourceType2 = "Type2"

      const resourceName3 = "My Third Resource Name";
      const resourceLocation3 = "East US";
      const resourceType3 = "Type3";
    
      const mockResources = [
        {
          name: resourceName1,
          location: resourceLocation1,
          type: resourceType1,
        },
        {
          name: resourceName2,
          location: resourceLocation2,
          type: resourceType2,
        },
        {
          name: resourceName3,
          location: resourceLocation3,
          type: resourceType3,
        },
      ]

      ResourceService.prototype.getResourceGroup = jest.fn(() => Promise.resolve(mockResourceGroup)) as any;
      ResourceService.prototype.getResources = jest.fn(() => Promise.resolve(mockResources)) as any;
      const info = await service.getInfo(ServiceInfoType.DEPLOYED);
      expect(info).toEqual({
        resourceGroup: resourceGroupName,
        isDryRun: false,
        resources: expectedResources,
        functionApp: {
          name: functionAppName,
          functions: ["function1", "function2", "function3"]
        },
        deployment: previouDeploymentTemplate
      })
    });

    it("prints summary", async () => {
      await service.printInfo(ServiceInfoType.DEPLOYED);
      expect(sls.cli.log).lastCalledWith([
        `\nResource Group Name: ${resourceGroupName}`,
        `Function App Name: ${functionAppName}`,
        "Functions:",
        "\t" + listOfFunctions.map((f) => f.name).join("\n\t"),
        "Azure Resources:",
        expectedResources.map((r) => JSON.stringify(r, null, 2)).join(",\n")
      ].join("\n"));
    });
  
    it("prints arm template", async () => {
      await verbose.printInfo(ServiceInfoType.DEPLOYED);
      expect(sls.cli.log).lastCalledWith(JSON.stringify(previouDeploymentTemplate, null, 2));
    });
  });  
});
