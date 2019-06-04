import Serverless from "serverless";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { FunctionAppService } from "./functionAppService";
import { BaseService } from "./baseService";

/**
 * APIM Service handles deployment and integration with Azure API Management
 */
export class ApimService extends BaseService {
  private apimClient: ApiManagementClient;
  private functionAppService: FunctionAppService;
  private config: any;
  
  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);

    this.config = this.serverless.service.provider["apim"];
    this.apimClient = new ApiManagementClient(this.credentials, this.subscriptionId);
    this.functionAppService = new FunctionAppService(serverless, options);
  }

  /**
   * Deploys the APIM top level api
   */
  public async deployApi() {
    const functionApp = await this.functionAppService.get();

    await this.ensureApi();
    await this.ensureFunctionAppKeys(functionApp);
    await this.ensureBackend(functionApp);
  }

  /**
   * Deploys all the functions of the serverless service to APIM
   */
  public async deployFunctions() {
    this.log("-> Deploying API Operations");

    const deployApiTasks = this.serverless.service
      .getAllFunctions()
      .map((functionName) => this.deployFunction({ function: functionName }));

    return Promise.all(deployApiTasks);
  }

  /**
   * Deploys the specified serverless function  to APIM
   * @param options 
   */
  public async deployFunction(options) {
    const functionConfig = this.serverless.service["functions"][options.function];

    if (!functionConfig.apim) {
      return;
    }

    const tasks = functionConfig.apim.operations.map((operation) => {
      return this.deployOperation({
        function: options.function,
        operation: operation
      });
    });

    await Promise.all(tasks);
  }

  /**
   * Deploys the APIM API referenced by the serverless service
   */
  private async ensureApi() {
    this.log("-> Deploying API")

    try {
      await this.apimClient.api.createOrUpdate(this.resourceGroup, this.config.resourceId, this.config.name, {
        isCurrent: true,
        displayName: this.config.displayName,
        description: this.config.description,
        path: this.config.urlSuffix,
        protocols: [
          this.config.urlScheme
        ]
      });
    } catch (e) {
      this.log("Error creating APIM API");
      this.log(JSON.stringify(e.body, null, 4));
    }
  }

  /**
   * Deploys the APIM Backend referenced by the serverless service
   * @param functionAppUrl The host name for the deployed function app
   */
  private async ensureBackend(functionApp) {
    this.log("-> Deploying API Backend")
    try {
      const functionAppResourceId = `https://management.azure.com${functionApp.id}`;

      await this.apimClient.backend.createOrUpdate(this.resourceGroup, this.config.resourceId, this.serviceName, {
        credentials: {
          header: {
            "x-functions-key": [`{{${this.serviceName}-key}}`],
          }
        },
        description: this.serviceName,
        protocol: "http",
        resourceId: functionAppResourceId,
        url: `https://${functionApp.defaultHostName}/api`
      });
    } catch (e) {
      this.log("Error creating APIM Backend");
      this.log(JSON.stringify(e.body, null, 4));
    }
  }

  /**
   * Deploys a single APIM api operation for the specified function
   * @param serverless The serverless framework 
   * @param options The plugin options
   */
  private async deployOperation(options) {
    this.log(`--> Deploying API operation ${options.function}`);

    try {
      const client = new ApiManagementClient(this.credentials, this.subscriptionId);

      const operationConfig = {
        displayName: options.operation.displayName || options.function,
        description: options.operation.description || "",
        urlTemplate: options.operation.path,
        method: options.operation.method,
        templateParameters: options.operation.templateParameters || [],
        responses: options.operation.responses || [],
      };

      await client.apiOperation.createOrUpdate(this.resourceGroup, this.config.resourceId, this.config.name, options.function, operationConfig);
      await client.apiOperationPolicy.createOrUpdate(this.resourceGroup, this.config.resourceId, this.config.name, options.function, {
        format: "rawxml",
        value: `
        <policies>
          <inbound>
            <base />
            <set-backend-service id="apim-generated-policy" backend-id="${this.serviceName}" />
          </inbound>
          <backend>
            <base />
          </backend>
          <outbound>
            <base />
          </outbound>
          <on-error>
            <base />
          </on-error>
        </policies>`
      });
    } catch (e) {
      this.log(`Error deploying API operation ${options.function}`);
      this.log(JSON.stringify(e, null, 4));
    }
  }

  /**
   * Gets the master key for the function app and stores a reference in the APIM instance
   * @param functionAppUrl The host name for the Azure function app
   */
  private async ensureFunctionAppKeys(functionApp) {
    this.log("-> Deploying API keys")
    try {
      const masterKey = await this.functionAppService.getMasterKey(functionApp);
      const keyName = `${this.serviceName}-key`;

      this.apimClient.property.createOrUpdate(this.resourceGroup, this.config.resourceId, keyName, {
        displayName: keyName,
        secret: true,
        value: masterKey
      });
    } catch (e) {
      this.log("Error creating APIM Property");
      this.log(JSON.stringify(e, null, 4));
    }
  }
}
