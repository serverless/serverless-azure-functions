import { ApiManagementClient } from '@azure/arm-apimanagement';
import { ResourceManagementClient } from '@azure/arm-resources';
import { WebSiteManagementClient } from '@azure/arm-appservice';
import request from 'request';

export const deployApi = async (serverless) => {
  serverless.cli.log('Starting to deploy API');

  const apimConfig = serverless.service.provider.apim;
  const resourceClient = new ResourceManagementClient(serverless.variables.azureCredentials, serverless.service.provider.subscriptionId);
  const apimClient = new ApiManagementClient(serverless.variables.azureCredentials, serverless.service.provider.subscriptionId);

  const resourceId = `/subscriptions/${serverless.service.provider.subscriptionId}/resourceGroups/${serverless.service.provider.resourceGroup}/providers/Microsoft.Web/sites/${serverless.service.service}`;
  const functionApp = await resourceClient.resources.getById(resourceId, '2018-11-01');

  await ensureApi();
  await ensureBackend();
  await ensureFunctionAppKey();

  async function ensureApi() {
    try {
      await apimClient.api.createOrUpdate(serverless.service.provider.resourceGroup, apimConfig.resourceId, apimConfig.name, {
        isCurrent: true,
        displayName: apimConfig.displayName,
        description: apimConfig.description,
        path: apimConfig.urlSuffix,
        protocols: [
          apimConfig.urlScheme
        ]
      });
    } catch (e) {
      serverless.cli.log('Error creating APIM API');
      serverless.cli.log(JSON.stringify(e.body, null, 4));
    }
  }

  async function ensureBackend() {
    try {
      const functionAppResourceId = `https://management.azure.com${resourceId}`;

      await apimClient.backend.createOrUpdate(serverless.service.provider.resourceGroup, apimConfig.resourceId, serverless.service.service, {
        // credentials: {
        //   header: {
        //     'x-functions-key': [`{{${apimConfig.name}}}`],
        //   }
        // },
        description: serverless.service.service,
        protocol: 'http',
        resourceId: functionAppResourceId,
        url: `https://${functionApp.properties.defaultHostName}/api`
      });
    } catch (e) {
      serverless.cli.log('Error creating APIM Backend');
      serverless.cli.log(JSON.stringify(e.body, null, 4));
    }
  }

  function getAdminToken() {
    // const webClient = new WebSiteManagementClient(serverless.variables.azureCredentials, serverless.service.provider.subscriptionId);
    // const adminTokenResult = await webClient.webApps.getFunctionsAdminToken(serverless.service.provider.resourceGroup, serverless.service.service);

    return new Promise((resolve, reject) => {
      const baseUrl = 'https://management.azure.com';
      const getTokenUrl = `${baseUrl}${functionApp.id}/functions/admin/token?api-version=2016-08-01`;

      request.get(getTokenUrl, {
        headers: {
          'Authorization': `Bearer ${serverless.variables.azureCredentials.tokenCache._entries[0].accessToken}`
        }
      }, (err, response) => {
        if (err) {
          return reject(err);
        }

        resolve(response.body.replace(/"/g, ''));
      });
    });
  }

  function getMasterKey(authToken) {
    return new Promise((resolve, reject) => {
      const apiUrl = `https://${functionApp.properties.defaultHostName}/admin/host/systemkeys/_master`;

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

  async function ensureFunctionAppKey() {
    try {
      serverless.cli.log('Getting key');

      const adminToken = await getAdminToken();
      const masterKey = await getMasterKey(adminToken);

      const keyName = `${serverless.service.service}-key`;

      apimClient.property.createOrUpdate(serverless.service.provider.resourceGroup, apimConfig.resourceId, keyName, {
        displayName: keyName,
        secret: true,
        value: masterKey
      });
    } catch (e) {
      serverless.cli.log('Error creating APIM Property');
      serverless.cli.log(JSON.stringify(e, null, 4));
    }
  }
};
