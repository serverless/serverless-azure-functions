# Azure Functions Serverless Plugin

This plugin enables Azure Functions support within the Serverless Framework.

[![Coverage Status](https://coveralls.io/repos/github/serverless/serverless-azure-functions/badge.svg)](https://coveralls.io/github/serverless/serverless-azure-functions)

## Quickstart

### Pre-requisites

1. Node.js v6.5.0+ *(this is the runtime version supported by Azure Functions)*
2. Serverless CLI `v1.9.0+`. You can run `npm i -g serverless` if you don't already have it.
3. An Azure account. If you don't already have one, you can sign up for a [free trial](https://azure.microsoft.com/en-us/free/) that includes $200 of free credit.

### Create a new Azure Function App

```bash
# Create Azure Function App from template
$ sls create -t azure-nodejs -p <appName>
# Move into project directory
$ cd <appName>
# Install dependencies (including this plugin)
$ npm install
```

### Running Function App Locally (`offline` plugin)

In order to run a Azure Function App locally, the `azure-functions-core-tools` package needs to be installed from NPM. Since it is only used for local development, we did not include it in the `devDependencies` of `package.json`. To install globally, run:

```bash
$ npm i azure-functions-core-tools -g
```

Then, at the root of your project directory, run:

```bash
# Builds necessary function bindings files and starts the function app
$ sls offline
```

The `offline` process will generate a directory for each of your functions, which will contain a file titled `function.json`. This will contain a relative reference to your handler file & exported function from that file as long as they are referenced correctly in `serverless.yml`.

After the necessary files are generated, it will start the function app from within the same shell. For HTTP functions, the local URLs will be displayed in the console when the function app is initialized.

To simply start the function app *without* building the files, run:

```bash
$ sls offline start
```

To build the files *without* spawning the process to start the function app, run:

```bash
$ sls offline build
```

To clean up files generated from the build, run:

```bash
sls offline cleanup
```

### Deploy Your Function App

Deploy your new service to Azure! The first time you do this, you will be asked to authenticate with your Azure account, so the `serverless` CLI can manage Functions on your behalf. Simply follow the provided instructions, and the deployment will continue as soon as the authentication process is completed.

```bash
$ sls deploy
```

For more advanced deployment scenarios, see our [deployment docs](docs/DEPLOY.md)

### Test Your Function App

Invoke your HTTP functions without ever leaving the CLI using:

```bash
$ sls invoke -f <functionName>
```

##### Invoke Options

- `-f` or `--function` - Function to Invoke
- `-d` or `--data` - Stringified JSON data to use as either query params or request body
- `-p` or `--path` - Path to JSON file to use as either query params or request body
- `-m` or `--method` - HTTP method for request

##### Example

After deploying template function app, run

```bash
$ sls invoke -f hello '{"name": "Azure"}'
```

### Roll Back Your Function App

To roll back your function app to a previous deployment, simply select a timestamp of a previous deployment and use `rollback` command.

```bash
# List all deployments to know the timestamp for rollback
$ sls deploy list
Serverless:
-----------
Name: myFunctionApp-t1561479533
Timestamp: 1561479533
Datetime: 2019-06-25T16:18:53+00:00
-----------
Name: myFunctionApp-t1561479506
Timestamp: 1561479506
Datetime: 2019-06-25T16:18:26+00:00
-----------
Name: myFunctionApp-t1561479444
Timestamp: 1561479444
Datetime: 2019-06-25T16:17:24+00:00
-----------

# Rollback Function App to timestamp
$ sls rollback -t 1561479506
```

This will update the app code and infrastructure to the selected previous deployment.

For more details, check out our [rollback docs](docs/ROLLBACK.md).

### Deleting Your Function App

If at any point you no longer need your service, you can run the following command to delete the resource group containing your Azure Function App and other depoloyed resources using:

```bash
$ sls remove
```

### Creating or removing Azure Functions

To create a new Azure Function within your function app, run the following command from within your app's directory:

```bash
# -n or --name for name of new function
$ sls func add -n {functionName}
```

This will create a new handler file at the root of your project with the title `{functionName}.js`. It will also update `serverless.yml` to contain the new function.

To remove an existing Azure Function from your function app, run the following command from within your app's directory:

```bash
# -n or --name for name of function to remove
$ sls func remove -n {functionName}
```

This will remove the `{functionName}.js` handler and remove the function from `serverless.yml`

*Note: Add & remove currently only support HTTP triggered functions. For other triggers, you will need to update `serverless.yml` manually

### Advanced Authentication

The getting started walkthrough illustrates the interactive login experience, which is recommended when getting started. However, for more robust use, a [service principal](https://docs.microsoft.com/en-us/azure/active-directory/develop/app-objects-and-service-principals) is recommended for authentication.

##### Creating a Service Principal

1. [Install the Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest)
2. Login via Azure CLI and set subscription
    ```bash
    # Login to Azure
    $ az login
    # Set Azure Subscription for which to create Service Principal
    $ az account set -s <subscription-id>
    ```
3. Generate Service Principal for Azure Subscription
    ```bash
    # Create SP with unique name
    $ az ad sp create-for-rbac --name <name>
    ```
    This will yield something like:
    ```json
    {
      "appId": "<servicePrincipalId>",
      "displayName": "<name>",
      "name": "<name>",
      "password": "<password>",
      "tenant": "<tenantId>"
    }
    ```
4. Set environment variables

    **Bash**
    ```bash
    $ export azureSubId='<subscriptionId>'
    $ export azureServicePrincipalTenantId='<tenantId>'
    $ export azureServicePrincipalClientId='<servicePrincipalId>'
    $ export azureServicePrincipalPassword='<password>'
    ```

    **Powershell**
    ```powershell
    $env:azureSubId='<subscriptionId>'
    $env:azureServicePrincipalTenantId='<tenantId>'
    $env:azureServicePrincipalClientId='<servicePrincipalName>'
    $env:azureServicePrincipalPassword='<password>'
    ```

### Example Usage
- [Configuring API Management](docs/examples/apim.md) that sits in front of function app

### Contributing

Please create issues in this repo for any problems or questions you find. Before sending a PR for any major changes, please create an issue to discuss.

We're still in the process of getting everying running 100%, but please refer to the [Serverless contributing guidlines](https://github.com/serverless/serverless/blob/master/CONTRIBUTING.md) for information on how to contribute and code of conduct.

#### Local dev

1. Clone this repository to your local machine
2. Navigate to the cloned folder
3. Run `npm install`
4. Run `npm run build`
5. Navigate to a folder where you created a new Serverless project, run `npm install`, and then run `npm link {path to serverless-azure-functions folder}`. Running `npm install` after the link command may override the link.
6. The npm modules should now contain your local version of this plugin.

#### Unit Tests

We use [Jest](https://jestjs.io/) for unit tests, and it is expected that every Pull Request containing code changes have accompanying unit tests.

Run unit tests using `npm test` or `npm run test:coverage` to get coverage results.

#### Signing commits

All commits in your Pull Request will need to be signed. When looking at the commits in the pull request, you will see a green 'verified' icon next to your commit. Commit signature verification is discussed [here](https://help.github.com/en/articles/about-commit-signature-verification).

Follow the directions [here](https://help.github.com/en/articles/signing-commits) to configure commit signing.

If any of your commits are not signed, your pull request will not be able to be merged into the base branch. You can fix this by squashing any unsigned commits into signed commits using an interactive rebase, and force pushing your new commit history. More detail [here](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History).

When using Windows you may also encounter an error when trying to sign a commit, stating that a security key could not be found. Ensure that you have set the path the gpg in the git config: `git config --global gpg.program "C:\Program Files (x86)\GnuPG\bin\gpg.exe"`

## License

[MIT](LICENSE)
