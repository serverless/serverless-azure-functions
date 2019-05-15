import { ApiManagementClient } from '@azure/arm-apimanagement';

export const deployApi = async (serverless) => {
  serverless.cli.log('Starting to deploy API');

  try {
    const apimConfig = serverless.service.provider.apim;

    const client = new ApiManagementClient(serverless.variables.azureCredentials, serverless.service.provider.subscriptionId);

    await client.api.createOrUpdate(serverless.service.provider.resourceGroup, apimConfig.resourceId, apimConfig.name, {
      isCurrent: true,
      displayName: apimConfig.displayName,
      description: apimConfig.description,
      path: apimConfig.urlSuffix,
      protocols: [
        apimConfig.urlScheme
      ]
    });

    const functionAppResourceId = `https://management.azure.com/subscriptions/${serverless.service.provider.subscriptionId}/resourceGroups/${serverless.service.provider.resourceGroup}/providers/Microsoft.Web/sites/$${serverless.service.service}`;

    await client.backend.createOrUpdate(serverless.service.provider.resourceGroup, apimConfig.resourceId, apimConfig.name, {
      credentials: {
        header: {
          'x-functions-key': [`{{${apimConfig.name}}}`],
          description: apimConfig.description,
          protocol: apimConfig.urlScheme,
          resourceId: functionAppResourceId
        }
      }
    });
  } catch (e) {
    serverless.cli.log(JSON.stringify(e, null, 4));
  }
};
