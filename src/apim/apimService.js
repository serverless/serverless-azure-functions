import { ApiManagementClient } from '@azure/arm-apimanagement';
import { ResourceManagementClient } from '@azure/arm-resources';
import request from 'request';

/**
 * APIM Service handles deployment and integration with Azure API Management
 */
export class ApimService {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.config = serverless.service.provider.apim;

    this.serviceName = serverless.service.service;
    this.credentials = serverless.variables.azureCredentials;
    this.subscriptionId = serverless.service.provider.subscriptionId;
    this.resourceGroup = serverless.service.provider.resourceGroup;

    this.resourceId = `/subscriptions/${this.subscriptionId}/resourceGroups/${this.resourceGroup}/providers/Microsoft.Web/sites/${this.serviceName}`;

    this.resourceClient = new ResourceManagementClient(this.credentials, this.subscriptionId);
    this.apimClient = new ApiManagementClient(this.credentials, this.subscriptionId);
  }

  /**
   * Deploys the APIM top level api
   */
  async deployApi() {
    const functionApp = await this.resourceClient.resources.getById(this.resourceId, '2018-11-01');

    await this.ensureApi();
    await this.ensureFunctionAppKeys(functionApp.properties.defaultHostName);
    await this.ensureBackend(functionApp.properties.defaultHostName);
  }

  /**
   * Deploys all the functions of the serverless service to APIM
   */
  async deployFunctions() {
    this.serverless.cli.log('Starting to deploy API Operations');

    const deployApiTasks = this.serverless.service
      .getAllFunctions()
      .map((functionName) => this.deployFunction({ function: functionName }));

    return Promise.all(deployApiTasks);
  }

  /**
   * Deploys the specified serverless function  to APIM
   * @param options 
   */
  async deployFunction(options) {
    const functionConfig = this.serverless.service.functions[options.function];

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
  async ensureApi() {
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
      this.serverless.cli.log('Error creating APIM API');
      this.serverless.cli.log(JSON.stringify(e.body, null, 4));
    }
  }

  /**
   * Deploys the APIM Backend referenced by the serverless service
   * @param functionAppUrl The host name for the deployed function app
   */
  async ensureBackend(functionAppUrl) {
    try {
      const functionAppResourceId = `https://management.azure.com${this.resourceId}`;

      await this.apimClient.backend.createOrUpdate(this.resourceGroup, this.config.resourceId, this.serviceName, {
        credentials: {
          header: {
            'x-functions-key': [`{{${this.serviceName}-key}}`],
          }
        },
        description: this.serviceName,
        protocol: 'http',
        resourceId: functionAppResourceId,
        url: `https://${functionAppUrl}/api`
      });
    } catch (e) {
      this.serverless.cli.log('Error creating APIM Backend');
      this.serverless.cli.log(JSON.stringify(e.body, null, 4));
    }
  }

  /**
   * Deploys a single APIM api operation for the specified function
   * @param serverless The serverless framework 
   * @param options The plugin options
   */
  async deployOperation(options) {
    this.serverless.cli.log(`Deploying API operation ${options.function}`);

    try {
      const client = new ApiManagementClient(this.credentials, this.subscriptionId);

      const operationConfig = {
        displayName: options.operation.displayName || options.function,
        description: options.operation.description || '',
        urlTemplate: options.operation.path,
        method: options.operation.method,
        templateParameters: options.operation.templateParameters || [],
        responses: options.operation.responses || [],
      };

      await client.apiOperation.createOrUpdate(this.resourceGroup, this.config.resourceId, this.config.name, options.function, operationConfig);
      await client.apiOperationPolicy.createOrUpdate(this.resourceGroup, this.config.resourceId, this.config.name, options.function, {
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
        </policies>`
      });
    } catch (e) {
      this.serverless.cli.log(`Error deploying API operation ${options.function}`);
      this.serverless.cli.log(JSON.stringify(e, null, 4));
    }
  }

  /**
   * Gets the master key for the function app and stores a reference in the APIM instance
   * @param functionAppUrl The host name for the Azure function app
   */
  async ensureFunctionAppKeys(functionAppUrl) {
    try {
      const adminToken = await this.getAdminToken();
      const masterKey = await this.getMasterKey(functionAppUrl, adminToken);

      const keyName = `${this.serviceName}-key`;

      this.apimClient.property.createOrUpdate(this.resourceGroup, this.config.resourceId, keyName, {
        displayName: keyName,
        secret: true,
        value: masterKey
      });
    } catch (e) {
      this.serverless.cli.log('Error creating APIM Property');
      this.serverless.cli.log(JSON.stringify(e, null, 4));
    }
  }

  /**
   * Gets a short lived admin token used to retrieve function keys
   */
  async getAdminToken() {
    return new Promise((resolve, reject) => {
      const baseUrl = 'https://management.azure.com';
      const getTokenUrl = `${baseUrl}${this.resourceId}/functions/admin/token?api-version=2016-08-01`;

      request.get(getTokenUrl, {
        headers: {
          'Authorization': `Bearer ${this.credentials.tokenCache._entries[0].accessToken}`
        }
      }, (err, response) => {
        if (err) {
          return reject(err);
        }

        resolve(response.body.replace(/"/g, ''));
      });
    });
  }

  /**
   * Gets the master key for the specified function app
   * @param functionAppUrl The function app url
   * @param authToken The JWT access token used for authorization
   */
  getMasterKey(functionAppUrl, authToken) {
    return new Promise((resolve, reject) => {
      const apiUrl = `https://${functionAppUrl}/admin/host/systemkeys/_master`;

      request.get(apiUrl, {
        json: true,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }, (err, response) => {
        if (err) {
          return reject(err);
        }

        resolve(response.body.value);
      });
    });
  }
}
