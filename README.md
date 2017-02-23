# Azure Functions Plugin 

This plugin enables Azure Functions support within the Serverless Framework.

## Getting started

### 1. Get a Serverless Service with Azure as the Provider

1. Recommend using Node v6.5.0
1. Install the serverless tooling - `npm i -g serverless`
1. Create boilerplate (change `my-app` to whatever you'd prefer): `serverless install --url https://github.com/azure/boilerplate-azurefunctions --name my-app`
1. `cd my-app`
2. `npm install`

### 2. Set up credentials

We'll set up an Azure Subscription and our service principal. You can learn more in the [credentials doc]( https://www.serverless.com/framework/docs/providers/azure/guide/credentials).

1. Set up an Azure Subscription

    Sign up for a free account @ [https://azure.com](https://azure.microsoft.com/en-us/services/functions/).

    Azure comes with a [free trial](https://azure.microsoft.com/en-us/free/) that includes $200 of free credit. 


2. . Get the Azure CLI

    ```
    npm i -g azure-cli
    ```

3. Login to Azure

    ```
    azure login
    ```

    This will give you a code and prompt you to visit [aka.ms/devicelogin](https://aka.ms/devicelogin). Provide the code and then login with your Azure identity (this may happen automatically if you're already logged in). You'll then be able to access your account via the CLI.

4. Get your subcription and tenant id

    ```
    azure account show
    ```

    Save the subcription and tenant id for later

5. Create a service principal for a given `<name>` and `<password>` and add contributor role.

    ```
    azure ad sp create -n <name> -p <password>
    ```

    This should return an object which has the `servicePrincipalNames` property on it and an ObjectId. Save the Object Id and one of the names in the array and the password you provided for later. If you need to look up your service principal later, you can use `azure ad sp -c <name>` where `<name>` is the name provided originally. Note that the `<name>` you provided is not the name you'll provide later, it is a name in the `servicePrincipalNames` array.

    Then grant the SP contributor access with the ObjectId

    ```bash
    azure role assignment create --objectId <objectIDFromCreateStep> -o Contributor
    ```

6. Set up environment variables

     You need to set up environment variables for your subscription id, tenant id, service principal name, and password. 

    ```bash
    # bash
    export azureSubId='<subscriptionId>'
    export azureServicePrincipalTenantId='<tenantId>'
    export azureServicePrincipalClientId='<servicePrincipalName>'
    export azureServicePrincipalPassword='<password>'
    ```

    ```powershell
    # PowerShell
    $env:azureSubId='<subscriptionId>'
    $env:azureServicePrincipalTenantId='<tenantId>'
    $env:azureServicePrincipalClientId='<servicePrincipalName>'
    $env:azureServicePrincipalPassword='<password>'
    ```


### 3. Update the config in `serverless.yml`

Open up your `serverless.yml` file and update the following information:

```yml
service: my-azure-functions-app # Name of the Azure function App you want to create
```

### 4. Deploy, test, and remove your service

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

5. **Remove the Service: (optional)**

  Removes all Functions and Resources from your Azure subscription.
  ```bash
  serverless remove
  ```  

### Contributing

Please create issues in this repo for any problems or questions you find. Before sending a PR for any major changes, please create an issue to discuss.

We're still in the process of getting everying running 100%, but please refer to the [Serverless contributing guidlines](https://github.com/serverless/serverless/blob/master/CONTRIBUTING.md) for information on how to contribute and code of conduct.

## License

[MIT](LICENSE)
