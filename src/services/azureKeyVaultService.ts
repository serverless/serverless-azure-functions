import Serverless from "serverless";
import { BaseService } from "./baseService";
import { FunctionAppService } from "./functionAppService";
import { KeyVaultManagementClient } from "@azure/arm-keyvault";
import { Vault, SecretPermissions } from "@azure/arm-keyvault/esm/models";
import { AzureKeyVaultConfig } from "../models/serverless";

/**
 * Services for the Key Vault Plugin
 */
export class AzureKeyVaultService extends BaseService {
  /**
   * Initialize key vault service and get function app
   * @param serverless Serverless object
   * @param options Serverless CLI options
   */
  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
  }

  /**
   * Sets the KeyVault policy for the function app to allow secrets permissions.
   * @param keyVaultConfig Azure Key Vault settings
   */
  public async setPolicy(keyVaultConfig: AzureKeyVaultConfig) {
    const subscriptionID = this.subscriptionId;
    const functionAppService = new FunctionAppService(this.serverless, this.options);
    const keyVaultClient = new KeyVaultManagementClient(this.credentials, subscriptionID);

    const functionApp = await functionAppService.get();
    const identity = functionApp.identity;
    let vault: Vault;

    try {
      vault = await keyVaultClient.vaults.get(keyVaultConfig.resourceGroup, keyVaultConfig.name);
    } catch (error) {
      throw new Error("Error: Specified vault not found")
    }

    const newEntry = {
      tenantId: identity.tenantId,
      objectId: identity.principalId,
      permissions: {
        secrets: ["get" as SecretPermissions],
      }
    }
    vault.properties.accessPolicies.push(newEntry);

    await keyVaultClient.vaults.createOrUpdate(keyVaultConfig.resourceGroup, keyVaultConfig.name, {location: vault.location, properties: vault.properties});
  }
}
