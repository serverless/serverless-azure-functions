# Azure Functions Plugin 

This plugin enables Azure Functions support within the Serverless Framework.

## Getting started


### Get a Serverless Service with Azure as the Provider

1. Clone gitrepo: `git clone -b dev https://github.com/pragnagopa/boilerplate-azurefunctions.git`.
2. npm install

### Get an Azure Subscription
 - <a href="https://azure.microsoft.com/en-us/free/?b=17.01" target="_blank">Create your free Azure account today</a>

### Create Service Principal User for your Azure subscription
1. Create a Service Principal User with <a href="https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal" target="_blank">portal</a> or <a href="https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-authenticate-service-principal-cli" target="_blank">Azure CLI</a>
2. <a href="https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal#get-tenant-id" target="_blank">Get tenant ID</a>
3. <a href="https://blogs.msdn.microsoft.com/mschray/2015/05/13/getting-your-azure-guid-subscription-id/" target="_blank">Get Azure subscription ID</a>
4. <a href="https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-create-service-principal-portal#get-application-id-and-authentication-key" target="_blank">Get application ID</a>. Note this is also referred to as the client id.


### Set the following environment variables:
  
- azureSubId: YourAzureSubscriptionID
- azureServicePrincipalTenantId: servicePrincipalTenantId
- azureservicePrincipalClientId: servicePrincipalClientId
- azureServicePrincipalPassword: servicePrincipalPassword

**Note:** If you created Service Principal User from Portal, servicePrincipalPassword is the authentication key

### Update the config in `serverless.yml`

Open up your `serverless.yml` file and update the following information:

#### `service` property

```yml
service: my-azure-functions-app # Name of the Azure function App you want to create
```
### Quick Start

1. **Deploy a Service:**

  Use this when you have made changes to your Functions or you simply want to deploy all changes within your Service at the same time.
  ```bash
  serverless deploy
  ```

2. **Deploy the Function:**

  Use this to quickly upload and overwrite your Azure function, allowing you to develop faster.
  ```bash
  serverless deploy function -f httpjs
  ```

3. **Invoke the Function:**

  Invokes an Azure Function on Azure
  ```bash
  serverless invoke --path httpQueryString.json -f httpjs
  ```

4. **Stream the Function Logs:**

  Open up a separate tab in your console and stream all logs for a specific Function using this command.
  ```bash
  serverless logs -f httpjs -t
  ```

5. **Remove the Service:**

  Removes all Functions and Resources from your Azure subscription.
  ```bash
  serverless remove
