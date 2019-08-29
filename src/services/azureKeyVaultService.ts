import Serverless from "serverless";
import { BaseService } from "./baseService";
import { FunctionAppService } from "./functionAppService";
import { KeyVaultManagementClient } from "@azure/arm-keyvault";
import { KeyPermissions, SecretPermissions } from "@azure/arm-keyvault/esm/models/index";


/**
 * Defines the Azure Key Vault configuration
 */
export interface AzureKeyVaultConfig {
  /** The name of the azure key vault */
  name: string;
  /** The name of the azure resource group with the key vault */
  resourceGroup: string;
}

/**
 * Services for the Key Vault Plugin
 */
export class AzureKeyVaultService extends BaseService {
  private funcApp: FunctionAppService;

  /**
   * Initialize key vault service and get function app
   * @param serverless Serverless object
   * @param options Serverless CLI options
   */
  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
    this.funcApp = new FunctionAppService(serverless, options);
  }

  /**
   * Sets the KeyVault policy for the function app to allow secrets permissions.
   * @param keyVaultConfig Azure Key Vault settings
   */
  public async setPolicy(keyVaultConfig: AzureKeyVaultConfig) {
    const subscriptionID = this.serverless.service.provider["subscriptionId"];

    const func = await this.funcApp.get();
    const identity = func.identity;

    const keyVaultClient = new KeyVaultManagementClient(this.credentials, subscriptionID);
    const vault = await keyVaultClient.vaults.get(keyVaultConfig.resourceGroup, keyVaultConfig.name);
    
    const policy = vault.properties.accessPolicies.filter((val)=>{val.objectId === identity.principalId && val.tenantId === identity.tenantId})[0];

    if(!policy){
      const newEntry = {
        tenantId: identity.tenantId,
        objectId: identity.principalId,
        permissions: {
          secrets: ["get" as SecretPermissions],
        }
      }
      vault.properties.accessPolicies.push(newEntry);
    } else {
      policy.permissions = {
        keys: ["get" as KeyPermissions],
        secrets: ["get" as SecretPermissions],
      }
    }

    return keyVaultClient.vaults.createOrUpdate(keyVaultConfig.resourceGroup, keyVaultConfig.name, {location: vault.location, properties: vault.properties})
  }
}
