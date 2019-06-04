import Serverless from 'serverless';
import { ApiManagementClient } from '@azure/arm-apimanagement';
import { FunctionAppService } from './functionAppService';
import { BaseService } from './baseService';
import { ApiManagementConfig, ApiOperationOptions } from '../models/apiManagement';
import {
  ApiContract, BackendContract, OperationContract,
  PropertyContract, ApiManagementServiceResource,
} from '@azure/arm-apimanagement/esm/models';
import { Site } from '@azure/arm-appservice/esm/models';

/**
 * APIM Service handles deployment and integration with Azure API Management
 */
export class ApimService extends BaseService {
  private apimClient: ApiManagementClient;
  private functionAppService: FunctionAppService;
  private config: ApiManagementConfig;

  public constructor(serverless: Serverless, options?: Serverless.Options) {
    super(serverless, options);

    this.config = this.serverless.service.provider['apim'];
    if (!this.config.backend) {
      this.config.backend = {} as any;
    }

    this.apimClient = new ApiManagementClient(this.credentials, this.subscriptionId);
    this.functionAppService = new FunctionAppService(serverless, options);
  }

  /**
   * Gets the configured APIM resource
   */
  public async get(): Promise<ApiManagementServiceResource> {
    if (!(this.config && this.config.name)) {
      return null;
    }

    try {
      return await this.apimClient.apiManagementService.get(this.resourceGroup, this.config.name);
    } catch (err) {
      return null;
    }
  }

  public async getApi(): Promise<ApiContract> {
    if (!(this.config && this.config.api && this.config.api.name)) {
      return null;
    }

    try {
      return await this.apimClient.api.get(this.resourceGroup, this.config.name, this.config.api.name);
    } catch (err) {
      return null;
    }
  }

  /**
   * Deploys the APIM top level api
   */
  public async deployApi() {
    const functionApp = await this.functionAppService.get();

    const api = await this.ensureApi();
    await this.ensureFunctionAppKeys(functionApp);
    await this.ensureBackend(functionApp);

    return api;
  }

  /**
   * Deploys all the functions of the serverless service to APIM
   */
  public async deployFunctions(service: ApiManagementServiceResource, api: ApiContract) {
    this.serverless.cli.log('-> Deploying API Operations');

    const deployApiTasks = this.serverless.service
      .getAllFunctions()
      .map((functionName) => this.deployFunction(service, api, { function: functionName }));

    return Promise.all(deployApiTasks);
  }

  /**
   * Deploys the specified serverless function  to APIM
   * @param options
   */
  public async deployFunction(service: ApiManagementServiceResource, api: ApiContract, options) {
    const functionConfig = this.serverless.service['functions'][options.function];

    if (!functionConfig.apim) {
      return;
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
   * Deploys the APIM API referenced by the serverless service
   */
  private async ensureApi(): Promise<ApiContract> {
    this.serverless.cli.log('-> Deploying API');

    try {
      return await this.apimClient.api.createOrUpdate(this.resourceGroup, this.config.name, this.config.api.name, {
        isCurrent: true,
        subscriptionRequired: this.config.api.subscriptionRequired,
        displayName: this.config.api.displayName,
        description: this.config.api.description,
        path: this.config.api.path,
        protocols: this.config.api.protocols,
      });
    } catch (e) {
      this.serverless.cli.log('Error creating APIM API');
      throw e;
    }
  }

  /**
   * Deploys the APIM Backend referenced by the serverless service
   * @param functionAppUrl The host name for the deployed function app
   */
  private async ensureBackend(functionApp: Site): Promise<BackendContract> {
    const backendUrl = `https://${functionApp.defaultHostName}/api`;

    this.serverless.cli.log(`-> Deploying API Backend ${functionApp.name} = ${backendUrl}`);
    try {
      const functionAppResourceId = `https://management.azure.com${functionApp.id}`;

      return await this.apimClient.backend.createOrUpdate(this.resourceGroup, this.config.name, this.serviceName, {
        credentials: {
          header: {
            'x-functions-key': [`{{${this.serviceName}-key}}`],
          },
        },
        title: this.config.backend.title || functionApp.name,
        tls: this.config.backend.tls,
        proxy: this.config.backend.proxy,
        description: this.config.backend.description,
        protocol: this.config.backend.protocol || 'http',
        resourceId: functionAppResourceId,
        url: backendUrl,
      });
    } catch (e) {
      this.serverless.cli.log('Error creating APIM Backend');
      throw e;
    }
  }

  /**
   * Deploys a single APIM api operation for the specified function
   * @param serverless The serverless framework
   * @param options The plugin options
   */
  private async deployOperation(
    service: ApiManagementServiceResource,
    api: ApiContract,
    options: ApiOperationOptions,
  ): Promise<OperationContract> {
    try {
      const client = new ApiManagementClient(this.credentials, this.subscriptionId);

      const operationConfig: OperationContract = {
        displayName: options.operation.displayName || options.function,
        description: options.operation.description || '',
        method: options.operation.method,
        urlTemplate: options.operation.urlTemplate,
        templateParameters: options.operation.templateParameters || [],
        responses: options.operation.responses || [],
      };

      const operationUrl = `${service.gatewayUrl}/${api.path}${operationConfig.urlTemplate}`;
      this.serverless.cli.log(`--> Deploying API operation ${options.function}: ${operationConfig.method.toUpperCase()} ${operationUrl}`);

      const operation = await client.apiOperation.createOrUpdate(
        this.resourceGroup,
        this.config.name,
        this.config.api.name,
        options.function,
        operationConfig,
      );

      await client.apiOperationPolicy.createOrUpdate(this.resourceGroup, this.config.name, this.config.api.name, options.function, {
        format: 'rawxml',
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
        </policies>`,
      });

      return operation;
    } catch (e) {
      this.serverless.cli.log(`Error deploying API operation ${options.function}`);
      this.serverless.cli.log(JSON.stringify(e.body, null, 4));
    }
  }

  /**
   * Gets the master key for the function app and stores a reference in the APIM instance
   * @param functionAppUrl The host name for the Azure function app
   */
  private async ensureFunctionAppKeys(functionApp): Promise<PropertyContract> {
    this.serverless.cli.log('-> Deploying API keys');
    try {
      const masterKey = await this.functionAppService.getMasterKey(functionApp);
      const keyName = `${this.serviceName}-key`;

      return await this.apimClient.property.createOrUpdate(this.resourceGroup, this.config.name, keyName, {
        displayName: keyName,
        secret: true,
        value: masterKey,
      });
    } catch (e) {
      this.serverless.cli.log('Error creating APIM Property');
      throw e;
    }
  }
}