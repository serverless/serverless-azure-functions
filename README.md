# Azure Functions Serverless Plugin

This plugin enables Azure Functions support within the Serverless Framework.

[![Coverage Status](https://coveralls.io/repos/github/serverless/serverless-azure-functions/badge.svg)](https://coveralls.io/github/serverless/serverless-azure-functions)

## Getting started

### Pre-requisites

1. Node.js v6.5.0+ *(this is the runtime version supported by Azure Functions)*
2. Serverless CLI `v1.9.0+`. You can run `npm i -g serverless` if you don't already have it.
3. An Azure account. If you don't already have one, you can sign up for a [free trial](https://azure.microsoft.com/en-us/free/) that includes $200 of free credit.

### Create a new Azure service

1. Create a new service using the standard Node.js template, specifying a unique name for your app: `serverless create -t azure-nodejs -p <appName>`
2. CD into the generated app directory: `cd <appName>`
3. Install the app's NPM dependencies, which includes this plugin: `npm install`

### Creating or removing Azure Functions

To create a new Azure Function within your function app, run the following command from within your app's directory:

```bash
sls func add -n {functionName}
```

This will create a new `{functionName}` directory at the root of your application with `index.js` and `function.json` inside the directory. It will also update `serverless.yml` to contain the new function.

To remove an existing Azure Function from your function app, run the following command from within your app's directory:

```bash
sls func remove -n {functionName}
```

This will remove the `{functionName}` directory and remove the function from `serverless.yml`

*Note: Add & remove currently only support HTTP triggered functions. For other triggers, you will need to update `serverless.yml` manually

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

#### Local dev

1. Clone this repository to your local machine
2. Navigate to the cloned folder
3. Run `npm install`
4. Run `npm run-script build`
5. Navigate to a folder where you created a new Serverless project, run `npm install`, and then run `npm link {path to serverless-azure-functions folder}`. Running `npm install` after the link command may override the link.
6. The npm modules should now contain your local version of this plugin.  

#### Signing commits

All commits in your Pull Request will need to be signed. When looking at the commits in the pull request, you will see a green 'verified' icon next to your commit. Commit signature verification is discussed [here](https://help.github.com/en/articles/about-commit-signature-verification)

Follow the directions [here](https://help.github.com/en/articles/signing-commits) to configure commit signing.

If any of your commits are not signed, your pull request will not be able to be merged into the base branch. You can fix this by squashing any unsigned commits into signed commits using an interactive rebase, and force pushing your new commit history. More detail [here](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History)

When using Windows you may also encounter an error when trying to sign a commit, stating that a security key could not be found. Ensure that you have set the path the gpg in the git config: `git config --global gpg.program "C:\Program Files (x86)\GnuPG\bin\gpg.exe"`

#### Signing commits

All commits in your Pull Request will need to be signed. When looking at the commits in the pull request, you will see a green 'verified' icon next to your commit. Commit signature verification is discussed [here](https://help.github.com/en/articles/about-commit-signature-verification)

Follow the directions [here](https://help.github.com/en/articles/signing-commits) to configure commit signing.

If any of your commits are not signed, your pull request will not be able to be merged into the base branch. You can fix this by squashing any unsigned commits into signed commits using an interactive rebase, and force pushing your new commit history. More detail [here](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History)

When using Windows you may also encounter an error when trying to sign a commit, stating that a security key could not be found. Ensure that you have set the path the gpg in the git config: `git config --global gpg.program "C:\Program Files (x86)\GnuPG\bin\gpg.exe"`

## License

[MIT](LICENSE)
