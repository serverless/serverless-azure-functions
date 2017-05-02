# Azure Functions Serverless Plugin 

This plugin enables Azure Functions support within the Serverless Framework.

## Getting started

### Pre-requisites

1. Node.js v6.5.0+ *(this is the runtime version supported by Azure Functions)*
2. Serverless CLI `v1.9.0+`. You can run `npm i -g serverless` if you don't already have it.
3. An Azure account. If you don't already have one, you can sign up for a [free trial](https://azure.microsoft.com/en-us/free/) that includes $200 of free credit.

### Create a new Azure service

1. Create a new service using the standard Node.js template, specifying a unique name for your app: `serverless create -t azure-nodejs -p <appName>`
2. CD into the generated app directory: `cd <appName>`
3. Install the app's NPM dependencies, which includes this plugin: `npm install`

### Deploy, test, and diagnose your Azure service

1. Deploy your new service to Azure! The first time you do this, you will be asked to authenticate with your Azure account, so the `serverless` CLI can manage Functions on your behalf. Simply follow the provided instructions, and the deployment will continue as soon as the authentication process is completed.

    ```bash
    serverless deploy
    ```

    > Note: Once you've authenticated, a new Azure "service principal" will be created, and used for subsequent deployments. This prevents you from needing to manually login again. See [below](#advanced-authentication) if you'd prefer to use a custom service principal instead.

2. Invoke a function, in order to test that it works:

    ```bash
    serverless invoke -f hello
    ```

3. Stream the output logs for your function:

    ```bash
    serverless logs -f hello
    ```
 
4. Make some code changes, `deploy` again, view logs, etc. and provide us feedback on how to make the experience even better!

    > Note: If you're working on a single function, you can use the `serverless deploy function -f <function>` command instead of `serverless deploy`, which will simply deploy the specified function instead of the entire service.

If at any point, you no longer need your service, you can run the following command to remove the Azure Functions that were created, and ensure you don't incur any unexpected charges:

```bash
serverless remove
``` 

### Advanced Authentication

The getting started walkthrough illustrates the interactive login experience, which is recommended for most users. However, if you'd prefer to create an Azure ["service principal"](https://github.com/Azure/azure-sdk-for-node/blob/master/Documentation/Authentication.md#2-azure-cli) yourself, you can indicate that this plugin should use its credentials instead, by setting the following environment variables:

**Bash**
```bash
export azureSubId='<subscriptionId>'
export azureServicePrincipalTenantId='<tenantId>'
export azureServicePrincipalClientId='<servicePrincipalName>'
export azureServicePrincipalPassword='<password>'
```

**Powershell**
```powershell
$env:azureSubId='<subscriptionId>'
$env:azureServicePrincipalTenantId='<tenantId>'
$env:azureServicePrincipalClientId='<servicePrincipalName>'
$env:azureServicePrincipalPassword='<password>'
```

### Contributing

Please create issues in this repo for any problems or questions you find. Before sending a PR for any major changes, please create an issue to discuss.

We're still in the process of getting everying running 100%, but please refer to the [Serverless contributing guidlines](https://github.com/serverless/serverless/blob/master/CONTRIBUTING.md) for information on how to contribute and code of conduct.

## License

[MIT](LICENSE)
