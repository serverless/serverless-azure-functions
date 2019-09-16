import Serverless from "serverless";
import { MockFactory } from "../test/mockFactory";
import { AzureKeyVaultService } from "./azureKeyVaultService";

import { Vaults } from "@azure/arm-keyvault";
import { FunctionAppService } from "./functionAppService";
import { AzureKeyVaultConfig } from "../models/serverless";

describe("Azure Key Vault Service", () => {
  const options: Serverless.Options = MockFactory.createTestServerlessOptions();
  const knownVaults = {
    testVault: {
      location: "WestUS",
      properties: {
        accessPolicies: []
      }
    }
  };

  let serverless: Serverless = MockFactory.createTestServerless();

  beforeEach(() => {
    Vaults.prototype.createOrUpdate = jest.fn();
    Vaults.prototype.get = jest.fn(async (resourceGroup, vaultName) => {
      if (!knownVaults.hasOwnProperty(vaultName)) {
        throw new Error("No matching vaults");
      }
      return knownVaults["testVault"];
    }) as any;

    FunctionAppService.prototype.get = jest.fn(() => {
      return {
        identity: {
          tenantId: "tid",
          principalId: "oid"
        }
      } as any;
    });
  });

  it("is defined", () => {
    expect(AzureKeyVaultService).toBeDefined();
  });

  it("can be instantiated", () => {
    const service = new AzureKeyVaultService(serverless, options);
    expect(service).not.toBeNull();
  });

  it("Throws an error if keyvault doesn't exist", async () => {
    const service = new AzureKeyVaultService(serverless, options);
    const keyVault: AzureKeyVaultConfig = MockFactory.createTestKeyVaultConfig(
      "fake-vault"
    );

    await expect(service.setPolicy(keyVault)).rejects.toThrowError(
      "Error: Specified vault not found"
    );
    await expect(Vaults.prototype.createOrUpdate).not.toBeCalled();
  });

  it("Sets correct policy if correct keyvault name is specified", async () => {
    const keyVault: AzureKeyVaultConfig = MockFactory.createTestKeyVaultConfig(
      "testVault"
    );
    const slsConfig: any = {
      ...MockFactory.createTestService(
        MockFactory.createTestSlsFunctionConfig()
      ),
      service: "test-sls",
      provider: {
        name: "azure",
        resourceGroup: "test-sls-rg",
        region: "West US",
        keyVault,
        runtime: "nodejs10.x",
      }
    };

    serverless = MockFactory.createTestServerless({
      service: slsConfig
    });

    const service = new AzureKeyVaultService(serverless, options);
    await service.setPolicy(keyVault);

    await expect(Vaults.prototype.createOrUpdate).toBeCalledWith(
      keyVault.resourceGroup,
      keyVault.name,
      {
        location: knownVaults["testVault"].location,
        properties: knownVaults["testVault"].properties
      }
    );
  });
});
