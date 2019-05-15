import { ApiManagementClient } from '@azure/arm-apimanagement';

/**
 * Deploys a single APIM api operation for the specified function
 * @param serverless The serverless framework 
 * @param options The plugin options
 */
export const deployOperation = async (serverless, options) => {
  serverless.cli.log(`Deploying operation ${options.function}`);

  try {
    const apimConfig = serverless.service.provider.apim;
    const client = new ApiManagementClient(serverless.variables.azureCredentials, serverless.service.provider.subscriptionId);

    const operationConfig = {
      displayName: options.operation.displayName || options.function,
      description: options.operation.description || '',
      urlTemplate: options.operation.path,
      method: options.operation.method,
      templateParameters: [],
      responses: [],
    };

    await client.apiOperation.createOrUpdate(serverless.service.provider.resourceGroup, apimConfig.resourceId, apimConfig.name, options.function, operationConfig);
  } catch (e) {
    serverless.cli.log(`Error deploying operation ${options.function}`);
    serverless.cli.log(JSON.stringify(e, null, 4));
  }
};

/**
 * Deploys the APIM configuration for the specified function
 * @param serverless The serverless framework 
 * @param options The plugin options
 */
export const deployFunction = async (serverless, options) => {
  const functionConfig = serverless.service.functions[options.function];

  const tasks = functionConfig.apim.operations.map((operation) => {
    return deployOperation(serverless, {
      function: options.function,
      operation: operation
    });
  });

  await Promise.all(tasks);
};
