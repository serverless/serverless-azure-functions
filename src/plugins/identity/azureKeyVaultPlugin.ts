import Serverless from "serverless";
import { ApimService } from "../../services/apimService";
import { AzureBasePlugin } from "../azureBasePlugin";
import { FunctionAppService } from "../../services/functionAppService";
import { KeyVaultManagementClient } from "@azure/arm-keyvault";
import { KeyPermissions, SecretPermissions } from "@azure/arm-keyvault/esm/models/index";
import { AzureLoginService } from "../../services/loginService"

export class AzureKeyVaultPlugin extends AzureBasePlugin {
  private funcApp: FunctionAppService;

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
    this.hooks = {
      "after:deploy:deploy": this.deploy.bind(this)
    };
    this.funcApp = new FunctionAppService(serverless, options);
  }

  private async deploy() {
    const keyVaultConfig = this.serverless.service.provider["keyVault"];
    if (!keyVaultConfig) {
      return Promise.resolve();
    }
    this.serverless.cli.log("Starting KeyVault service setup");

    const subscriptionID = this.serverless.service.provider["subscriptionId"];
    const resouceGroup = this.funcApp.getResourceGroupName()
    const authResult = await AzureLoginService.login();


    const func = await this.funcApp.get();
    const identity = func.identity;

    const keyVaultClient = new KeyVaultManagementClient(authResult.credentials, subscriptionID);
    const vault = await keyVaultClient.vaults.get(resouceGroup, keyVaultConfig.name);
    
    const policy = vault.properties.accessPolicies.filter((val)=>{val.objectId === identity.principalId && val.tenantId === identity.tenantId})[0];

    if(!policy){
      const newEntry = {
        tenantId: identity.tenantId,
        objectId: identity.principalId,
        permissions: {
          keys: ["get" as KeyPermissions],
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

    return keyVaultClient.vaults.createOrUpdate(resouceGroup, keyVaultConfig.name, {location: vault.location, properties: vault.properties})

    this.log("Finished KeyVault service setup");
  }
}
