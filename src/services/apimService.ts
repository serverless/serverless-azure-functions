import Serverless from "serverless";
import xml from "xml";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { FunctionAppService } from "./functionAppService";
import { BaseService } from "./baseService";
import { ApiManagementConfig, ApiOperationOptions, ApiCorsPolicy } from "../models/apiManagement";
import {
  ApiContract, OperationContract,
  PropertyContract, ApiManagementServiceResource, BackendContract,
} from "@azure/arm-apimanagement/esm/models";
import { Site } from "@azure/arm-appservice/esm/models";
import { Guard } from "../shared/guard";
import { ApimResource } from "../armTemplates/resources/apim";

/**
 * APIM Service handles deployment and integration with Azure API Management
 */
export class ApimService extends BaseService {
  private apimClient: ApiManagementClient;
  private functionAppService: FunctionAppService;
  private apimConfig: ApiManagementConfig;

  public constructor(serverless: Serverless, options?: Serverless.Options) {
    super(serverless, options);

    this.apimConfig = this.config.provider.apim;
    if (!this.apimConfig) {
      return;
    }

    if (!this.apimConfig.name) {
      this.apimConfig.name = ApimResource.getResourceName(this.config);
    }

    if (!this.apimConfig.backend) {
      this.apimConfig.backend = {} as any;
    }

    this.apimClient = new ApiManagementClient(this.credentials, this.subscriptionId);
    this.functionAppService = new FunctionAppService(serverless, options);
  }

  /**
   * Gets the configured APIM resource
   */
  public async get(): Promise<ApiManagementServiceResource> {
    if (!(this.apimConfig && this.apimConfig.name)) {
      return null;
    }

    try {
      return await this.apimClient.apiManagementService.get(this.resourceGroup, this.apimConfig.name);
    } catch (err) {
      return null;
    }
  }

  public async getApi(): Promise<ApiContract> {
    if (!(this.apimConfig && this.apimConfig.api && this.apimConfig.api.name)) {
      return null;
    }

    try {
      return await this.apimClient.api.get(this.resourceGroup, this.apimConfig.name, this.apimConfig.api.name);
    } catch (err) {
      return null;
    }
  }

  /**
   * Deploys the APIM top level api
   */
  public async deployApi() {
    if (!(this.apimConfig && this.apimConfig.name)) {
      return null;
    }

    const functionApp = await this.functionAppService.get();

    const resource = await this.get();
    const api = await this.ensureApi();
    await this.ensureFunctionAppKeys(functionApp);
    await this.ensureBackend(functionApp);
    await this.deployFunctions(functionApp, resource, api);

    return api;
  }

  /**
   * Deploys all the functions of the serverless service to APIM
   */
  public async deployFunctions(functionApp: Site, service: ApiManagementServiceResource, api: ApiContract) {
    Guard.null(service);
    Guard.null(api);

    if (!(this.apimConfig && this.apimConfig.name)) {
      return null;
    }

    this.log("-> Deploying API Operations");

    const deployApiTasks = this.serverless.service
      .getAllFunctions()
      .map((functionName) => this.deployFunction(functionApp, service, api, { function: functionName }));

    return Promise.all(deployApiTasks);
  }

  /**
   * Deploys the specified serverless function  to APIM
   * @param options
   */
  public async deployFunction(functionApp: Site, service: ApiManagementServiceResource, api: ApiContract, options) {
    Guard.null(functionApp);
    Guard.null(service);
    Guard.null(api);
    Guard.null(options);

    const functionConfig = this.serverless.service["functions"][options.function];
    functionConfig.name = options.function;

    const httpEvent = functionConfig.events.find((event) => event.http);
    if (!httpEvent) {
      return;
    }

    this.ensureFunctionBackend(functionApp, functionConfig);

    const httpConfig = httpEvent["x-azure-settings"];

    // Infer APIM operation configuration from HTTP event
    if (!functionConfig.apim) {
      const operations = httpConfig.methods.map((method) => {
        return {
          name: functionConfig.name,
          displayName: functionConfig.name,
          urlTemplate: httpConfig.route || functionConfig.name,
          method: method,
          templateParameters: this.getTemplateParameters(httpConfig.route)
        };
      })

      functionConfig.apim = { operations };
    }

    const tasks = functionConfig.apim.operations.map((operation) => {
      return this.deployOperation(service, api, {
        function: options.function,
        operation,
      });
    });

    await Promise.all(tasks);
  }

  /**
   * Retrieves the template parameter referenced in the route template
   * @param route The route template to inspect
   */
  private getTemplateParameters(route: string) {
    const matches = [...route["matchAll"](/{(\w+)}/g)];
    if (!matches.length) {
      return null;
    }

    const templateParamMap = {};
    matches.forEach((match) => {
      templateParamMap[match[1]] = "string"
    });

    return templateParamMap;
  }

  /**
   * Deploys the APIM API referenced by the serverless service
   */
  private async ensureApi(): Promise<ApiContract> {
    this.log("-> Deploying API");

    try {
      const api = await this.apimClient.api.createOrUpdate(this.resourceGroup, this.apimConfig.name, this.apimConfig.api.name, {
        isCurrent: true,
        subscriptionRequired: this.apimConfig.api.subscriptionRequired,
        displayName: this.apimConfig.api.displayName,
        description: this.apimConfig.api.description,
        path: this.apimConfig.api.path,
        protocols: this.apimConfig.api.protocols,
      });

      if (this.apimConfig.cors) {
        this.log("-> Deploying CORS policy");

        await this.apimClient.apiPolicy.createOrUpdate(this.resourceGroup, this.apimConfig.name, this.apimConfig.api.name, {
          format: "rawxml",
          value: this.createCorsXmlPolicy(this.apimConfig.cors)
        });
      }

      return api;
    } catch (e) {
      this.log("Error creating APIM API");
      this.log(JSON.stringify(e.body, null, 4));
      throw e;
    }
  }

  /**
   * Deploys the APIM Backend referenced by the serverless service
   * @param functionAppUrl The host name for the deployed function app
   */
  private async ensureBackend(functionApp: Site): Promise<BackendContract> {
    const backendPath = this.apimConfig.backend.url || "api";
    const backendUrl = `https://${functionApp.defaultHostName}/${backendPath}`;

    this.log(`-> Deploying API Backend ${functionApp.name} = ${backendUrl}`);
    try {
      const functionAppResourceId = `https://management.azure.com${functionApp.id}`;

      return await this.apimClient.backend.createOrUpdate(this.resourceGroup, this.apimConfig.name, this.serviceName, {
        credentials: {
          header: {
            "x-functions-key": [`{{${this.serviceName}-key}}`],
          },
        },
        title: this.apimConfig.backend.title || functionApp.name,
        tls: this.apimConfig.backend.tls,
        proxy: this.apimConfig.backend.proxy,
        description: this.apimConfig.backend.description,
        protocol: this.apimConfig.backend.protocol || "http",
        resourceId: functionAppResourceId,
        url: backendUrl,
      });
    } catch (e) {
      this.log("Error creating APIM Backend");
      this.log(JSON.stringify(e.body, null, 4));
      throw e;
    }
  }

  /**
   * Deploys the HTTP backend service required to support the function
   * @param functionApp The Azure function app
   * @param functionConfig The serverless function configuration
   */
  private async ensureFunctionBackend(functionApp: Site, functionConfig: any): Promise<BackendContract> {
    Guard.null(functionApp);
    Guard.null(functionConfig);

    const httpEvent = functionConfig.events.find((event) => event.http);
    if (!(httpEvent && functionConfig.apim.backend)) {
      return;
    }

    const backendName = functionConfig.apim.backend.name || `${this.serviceName}-${functionConfig.name}`;
    const backendUrl = `https://${functionApp.defaultHostName}/${functionConfig.apim.backend.url}`

    this.log(`-> Deploying Function Backend ${backendName} = ${backendUrl}`);
    try {
      const functionAppResourceId = `https://management.azure.com${functionApp.id}`;

      return await this.apimClient.backend.createOrUpdate(this.resourceGroup, this.apimConfig.name, backendName, {
        credentials: {
          header: {
            "x-functions-key": [`{{${this.serviceName}-key}}`],
          },
        },
        title: backendName,
        tls: functionConfig.apim.backend.tls,
        proxy: functionConfig.apim.backend.proxy,
        description: functionConfig.apim.backend.description,
        protocol: functionConfig.apim.backend || "http",
        resourceId: functionAppResourceId,
        url: `https://${functionApp.defaultHostName}${functionConfig.apim.backend.url}`,
      });
    } catch (e) {
      this.log("Error creating APIM Function Backend");
      this.log(JSON.stringify(e.body, null, 4));
      throw e;
    }
  }

  /**
   * Deploys a single APIM api operation for the specified function
   * @param serverless The serverless framework
   * @param options The plugin options
   */
  private async deployOperation(service: ApiManagementServiceResource, api: ApiContract, options: ApiOperationOptions): Promise<OperationContract> {
    try {
      const client = new ApiManagementClient(this.credentials, this.subscriptionId);

      const operationConfig: OperationContract = {
        displayName: options.operation.displayName || options.function,
        description: options.operation.description || "",
        method: options.operation.method,
        urlTemplate: options.operation.urlTemplate,
        templateParameters: options.operation.templateParameters || [],
        responses: options.operation.responses || [],
      };

      // Ensure a single path seperator in the operation path
      const operationPath = `/${api.path}/${operationConfig.urlTemplate}`.replace(/\/+/g, "/");
      const operationUrl = `${service.gatewayUrl}${operationPath}`;
      this.log(`--> Deploying API operation ${options.function}: ${operationConfig.method.toUpperCase()} ${operationUrl}`);

      // Determine if the function requires a custom backend configuration otherwise default to top level APIM backend config
      const functionConfig = this.serverless.service["functions"][options.function];
      const backendId = functionConfig.apim && functionConfig.apim.backend
        ? `${this.serviceName}-${options.function}`
        : this.serviceName;

      const operation = await client.apiOperation.createOrUpdate(
        this.resourceGroup,
        this.apimConfig.name,
        this.apimConfig.api.name,
        options.function,
        operationConfig,
      );

      await client.apiOperationPolicy.createOrUpdate(this.resourceGroup, this.apimConfig.name, this.apimConfig.api.name, options.function, {
        format: "rawxml",
        value: this.createApiOperationXmlPolicy(backendId),
      });

      return operation;
    } catch (e) {
      this.log(`Error deploying API operation ${options.function}`);
      this.log(JSON.stringify(e.body, null, 4));
      throw e;
    }
  }

  /**
   * Gets the master key for the function app and stores a reference in the APIM instance
   * @param functionAppUrl The host name for the Azure function app
   */
  private async ensureFunctionAppKeys(functionApp: Site): Promise<PropertyContract> {
    this.log("-> Deploying API keys");
    try {
      const masterKey = await this.functionAppService.getMasterKey(functionApp);
      const keyName = `${this.serviceName}-key`;

      return await this.apimClient.property.createOrUpdate(this.resourceGroup, this.apimConfig.name, keyName, {
        displayName: keyName,
        secret: true,
        value: masterKey,
      });
    } catch (e) {
      this.log("Error creating APIM Property");
      this.log(JSON.stringify(e.body, null, 4));
      throw e;
    }
  }

  /**
   * Creates the XML payload that defines the API operation policy to link to the configured backend
   */
  private createApiOperationXmlPolicy(backendId: string): string {
    const operationPolicy = [{
      policies: [
        {
          inbound: [
            { base: null },
            {
              "set-backend-service": [
                {
                  "_attr": {
                    "id": "apim-generated-policy",
                    "backend-id": backendId,
                  }
                },
              ],
            },
          ],
        },
        { backend: [{ base: null }] },
        { outbound: [{ base: null }] },
        { "on-error": [{ base: null }] },
      ]
    }];

    return xml(operationPolicy);
  }

  /**
   * Creates the XML payload that defines the specified CORS policy
   * @param corsPolicy The CORS policy
   */
  private createCorsXmlPolicy(corsPolicy: ApiCorsPolicy): string {
    const origins = corsPolicy.allowedOrigins ? corsPolicy.allowedOrigins.map((origin) => ({ origin })) : null;
    const methods = corsPolicy.allowedMethods ? corsPolicy.allowedMethods.map((method) => ({ method })) : null;
    const allowedHeaders = corsPolicy.allowedHeaders ? corsPolicy.allowedHeaders.map((header) => ({ header })) : null;
    const exposeHeaders = corsPolicy.exposeHeaders ? corsPolicy.exposeHeaders.map((header) => ({ header })) : null;

    const policy = [{
      policies: [
        {
          inbound: [
            { base: null },
            {
              cors: [
                { "_attr": { "allow-credentials": corsPolicy.allowCredentials } },
                { "allowed-origins": origins },
                { "allowed-methods": methods },
                { "allowed-headers": allowedHeaders },
                { "expose-headers": exposeHeaders },
              ]
            }
          ],
        },
        { backend: [{ base: null }] },
        { outbound: [{ base: null }] },
        { "on-error": [{ base: null }] },
      ]
    }];

    return xml(policy, { indent: "\t" });
  }
}
