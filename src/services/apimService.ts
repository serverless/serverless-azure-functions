import Serverless from "serverless";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { FunctionAppService } from "./functionAppService";
import { BaseService } from "./baseService";
import { ApiManagementConfig } from "../models/apiManagement";
import { ApimPolicyBuilder } from "../services/apimPolicyBuilder";
import {
  ApiContract, OperationContract,
  PropertyContract, ApiManagementServiceResource, BackendContract, PolicyContract,
} from "@azure/arm-apimanagement/esm/models";
import { Site } from "@azure/arm-appservice/esm/models";
import { Guard } from "../shared/guard";
import { ApimResource } from "../armTemplates/resources/apim";
import { ServerlessExtraAzureSettingsConfig } from "../models/serverless";

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

    if (typeof (this.apimConfig) === "boolean") {
      this.apimConfig = {
        name: null,
        apis: [],
      };
    }

    if (!this.apimConfig.name) {
      this.apimConfig.name = ApimResource.getResourceName(this.config);
    }

    if (!this.apimConfig.apis) {
      this.apimConfig.apis = [];
    }

    if (!this.apimConfig.backends) {
      this.apimConfig.backends = [];
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

  /**
   * Gets the APIM API by API name
   * @param apiName The API to retrieve
   */
  public async getApi(apiName: string): Promise<ApiContract> {
    Guard.empty(apiName);

    if (!(this.apimConfig && this.apimConfig.name)) {
      return null;
    }

    try {
      return await this.apimClient.api.get(this.resourceGroup, this.apimConfig.name, apiName);
    } catch (err) {
      return null;
    }
  }

  /**
   * Deploys the APIM top level api
   */
  public async deploy() {
    if (!(this.apimConfig && this.apimConfig.name)) {
      return null;
    }

    const functionApp = await this.functionAppService.get();
    this.setApimDefaults(functionApp);
    await this.ensureFunctionAppKeys(functionApp);

    const resource = await this.get();
    const apiTasks = this.apimConfig.apis.map((api) => this.ensureApi(api));
    const backendTasks = this.apimConfig.backends.map((backend) => this.ensureBackend(functionApp, backend));

    await Promise.all(apiTasks);
    await Promise.all(backendTasks);

    await this.deployFunctions(functionApp, resource);
  }

  /**
   * Deploys all the functions of the serverless service to APIM
   */
  public async deployFunctions(functionApp: Site, resource: ApiManagementServiceResource) {
    Guard.null(resource);

    if (!(this.apimConfig && this.apimConfig.name)) {
      return null;
    }

    this.log(`-> Deploying API Operations: ${this.apimConfig.name}`);

    const deployApiTasks = this.serverless.service
      .getAllFunctions()
      .map((functionName) => this.deployFunction(functionApp, resource, functionName));

    return await Promise.all(deployApiTasks);
  }

  /**
   * Deploys the specified serverless function  to APIM
   * @param options
   */
  public async deployFunction(functionApp: Site, resource: ApiManagementServiceResource, functionName: string) {
    Guard.null(functionApp);
    Guard.null(resource);
    Guard.empty(functionName);

    const functionConfig = this.serverless.service["functions"][functionName];
    functionConfig.name = functionName;

    const httpEvent = functionConfig.events.find((event) => event.http);
    if (!httpEvent) {
      return;
    }

    const httpConfig: ServerlessExtraAzureSettingsConfig = httpEvent["x-azure-settings"];

    // Default to GET method if not specified
    if (!httpConfig.methods) {
      httpConfig.methods = ["GET"]
    }

    // Infer APIM operation configuration from HTTP event if not already set
    if (!functionConfig.apim) {
      const operations = httpConfig.methods.map((method) => {
        return {
          name: `${method}-${functionConfig.name}`,
          displayName: `${functionConfig.name} (${method})`,
          urlTemplate: httpConfig.route || functionConfig.name,
          method: method,
          templateParameters: this.getTemplateParameters(httpConfig.route)
        };
      })

      functionConfig.apim = { operations };
    }

    // Lookup api mapping
    const apiContract = functionConfig.apim.api
      ? this.apimConfig.apis.find((api) => api.name === functionConfig.apim.api)
      : this.apimConfig.apis[0];

    // Lookup backend mapping
    const backendContract = functionConfig.apim.backend
      ? this.apimConfig.backends.find((backend) => backend.name === functionConfig.apim.backend)
      : this.apimConfig.backends[0];

    const tasks = functionConfig.apim.operations
      .map((operation) => this.deployOperation(resource, apiContract, backendContract, operation, functionName));

    await Promise.all(tasks);
  }

  /**
   * Retrieves the template parameter referenced in the route template
   * @param route The route template to inspect
   */
  private getTemplateParameters(route: string) {
    const regex = new RegExp(/{(\w+)}/g);
    const matches = [];
    while (true) {
      const match = regex.exec(route);
      if (!match) {
        break;
      }

      matches.push(match);
    };

    if (matches.length === 0) {
      return null;
    }

    return matches.map((match) => ({
      name: match[1],
      type: "string",
    }));
  }

  /**
   * Deploys the APIM API referenced by the serverless service
   */
  private async ensureApi(apiContract: ApiContract): Promise<ApiContract> {
    this.log(`-> Deploying API: ${apiContract.name}`);

    try {
      const api = await this.apimClient.api.createOrUpdate(this.resourceGroup, this.apimConfig.name, apiContract.name, {
        ...apiContract,
        isCurrent: true,
      });

      await this.setApiPolicies(apiContract);

      return api;
    } catch (e) {
      this.log("Error creating APIM API");
      this.log(this.stringify(e.body));
      throw e;
    }
  }

  /**
   * Deploys the APIM Backend referenced by the serverless service
   * @param functionAppUrl The host name for the deployed function app
   */
  private async ensureBackend(functionApp: Site, backendContract: BackendContract): Promise<BackendContract> {
    const backendUrl = `https://${functionApp.defaultHostName}/${backendContract.url}`;

    this.log(`-> Deploying API Backend: ${backendContract.name} => ${backendUrl}`);
    try {
      const functionAppResourceId = `https://management.azure.com${functionApp.id}`;

      return await this.apimClient.backend.createOrUpdate(this.resourceGroup, this.apimConfig.name, backendContract.name, {
        credentials: {
          header: {
            "x-functions-key": [`{{${this.serviceName}-key}}`],
          },
        },
        name: backendContract.name,
        title: backendContract.title || functionApp.name,
        tls: backendContract.tls,
        proxy: backendContract.proxy,
        description: backendContract.description,
        protocol: backendContract.protocol || "http",
        resourceId: functionAppResourceId,
        url: backendUrl,
      });
    } catch (e) {
      this.log("Error creating APIM Backend");
      this.log(this.stringify(e.body));
      throw e;
    }
  }

  /**
   * Deploys a single APIM api operation for the specified function
   * @param serverless The serverless framework
   * @param options The plugin options
   */
  private async deployOperation(resource: ApiManagementServiceResource, api: ApiContract, backend: BackendContract, operation: OperationContract, functionName: string): Promise<OperationContract> {
    try {
      const client = new ApiManagementClient(this.credentials, this.subscriptionId);

      const operationConfig: OperationContract = {
        name: operation.name || functionName,
        displayName: operation.displayName || functionName,
        description: operation.description || "",
        method: operation.method,
        urlTemplate: operation.urlTemplate,
        templateParameters: operation.templateParameters || [],
        responses: operation.responses || [],
      };

      // Ensure a single path separator in the operation path
      const operationPath = `/${api.path}/${operationConfig.urlTemplate}`.replace(/\/+/g, "/");
      const operationUrl = `${resource.gatewayUrl}${operationPath}`;
      this.log(`--> ${operationConfig.name}: [${operationConfig.method.toUpperCase()}] ${operationUrl}`);

      const result = await client.apiOperation.createOrUpdate(
        this.resourceGroup,
        this.apimConfig.name,
        api.name,
        operationConfig.name,
        operationConfig,
      );

      // Get any existing operation policy merge in backend service
      const operationPolicy = await this.getApiOperationPolicy(api, operationConfig);
      const policyBuilder = operationPolicy
        ? await ApimPolicyBuilder.parse(operationPolicy.value)
        : new ApimPolicyBuilder();

      const policyXml = policyBuilder
        .setBackendService(backend.name)
        .build();

      await client.apiOperationPolicy.createOrUpdate(this.resourceGroup, this.apimConfig.name, api.name, operationConfig.name, {
        format: "rawxml",
        value: policyXml,
      });

      return result;
    } catch (e) {
      this.log(`Error deploying API operation ${functionName}`);
      this.log(this.stringify(e.body));
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
      this.log(this.stringify(e.body));
      throw e;
    }
  }

  /**
   * Sets policies on the API from serverless configuration
   * @param apiContract The API contract
   */
  private async setApiPolicies(apiContract: ApiContract) {
    let requireUpdate = false;
    const existingPolicy = await this.getApiPolicy(apiContract);

    const builder = existingPolicy
      ? await ApimPolicyBuilder.parse(existingPolicy.value)
      : new ApimPolicyBuilder();

    if (this.apimConfig.cors) {
      builder.cors(this.apimConfig.cors);
      requireUpdate = true;
    }

    if (this.apimConfig.jwtValidate) {
      builder.jwtValidate(this.apimConfig.jwtValidate);
      requireUpdate = true;
    }

    // Support backwards compatibility for single IP filter
    if (this.apimConfig.ipFilter) {
      this.apimConfig.ipFilters = [this.apimConfig.ipFilter];
    }

    if (this.apimConfig.ipFilters) {
      this.apimConfig.ipFilters.forEach((policy) => {
        builder.ipFilter(policy);
        requireUpdate = true;
      });
    }

    if (this.apimConfig.checkHeaders) {
      this.apimConfig.checkHeaders.forEach((policy) => {
        builder.checkHeader(policy);
        requireUpdate = true;
      });
    }

    if (requireUpdate) {
      const policyXml = builder.build();

      await this.apimClient.apiPolicy.createOrUpdate(this.resourceGroup, this.apimConfig.name, apiContract.name, {
        format: "rawxml",
        value: policyXml
      });
    }
  }

  /**
   * Gets the API policy associated with the specified API
   * @param apiContract The API to query for policies
   */
  private async getApiPolicy(apiContract: ApiContract): Promise<PolicyContract> {
    Guard.null(apiContract);

    try {
      return await this.apimClient.apiPolicy.get(this.resourceGroup, this.apimConfig.name, apiContract.name);
    } catch (err) {
      return null;
    }
  }

  /**
   * Gets the API operation policy associated with the specified operation
   * @param apiContract The API associated with the operation
   * @param operationContract The API operation to query for policies
   */
  private async getApiOperationPolicy(apiContract: ApiContract, operationContract: OperationContract): Promise<PolicyContract> {
    Guard.null(apiContract);
    Guard.null(operationContract);

    try {
      return await this.apimClient.apiOperationPolicy.get(this.resourceGroup, this.apimConfig.name, apiContract.name, operationContract.name);
    } catch (err) {
      return null;
    }
  }

  /**
   * Sets up APIM defaults if not explicitly defined
   * @param functionApp The function app resource
   */
  private setApimDefaults(functionApp: Site) {
    const defaultApi: ApiContract = {
      isCurrent: true,
      name: `${this.serviceName}-api`,
      subscriptionRequired: false,
      displayName: "API",
      description: "",
      path: "api",
      protocols: ["http", "https"]
    }

    if (this.apimConfig.apis.length === 0) {
      this.apimConfig.apis.push(defaultApi);
    }

    const functionAppResourceId = `https://management.azure.com${functionApp.id}`;

    // Configure a default backend link if not explicity defined
    const defaultBackend: BackendContract = {
      credentials: {
        header: {
          "x-functions-key": [`{{${this.serviceName}-key}}`],
        },
      },
      name: `${this.serviceName}-backend`,
      title: functionApp.name,
      description: "Function App Backend",
      protocol: "http",
      resourceId: functionAppResourceId,
      url: "api"
    };

    if (this.apimConfig.backends.length === 0) {
      this.apimConfig.backends.push(defaultBackend);
    }
  }
}
