# Azure Functions Serverless Plugin - *Currently looking for active maintainers*

Reach out to [@medikoo](https://github.com/medikoo) to discuss becoming a maintainer if interested.

This plugin enables Azure Functions support within the Serverless Framework.

[![Build Status](https://dev.azure.com/serverless-inc/serverless-azure-functions/_apis/build/status/Publish%20Release?branchName=master)](https://dev.azure.com/serverless-inc/serverless-azure-functions/_build/latest?definitionId=13&branchName=master) [![Code Coverage](https://codecov.io/gh/serverless/serverless-azure-functions/branch/dev/graph/badge.svg)](https://codecov.io/gh/serverless/serverless-azure-functions) [![npm version](https://badge.fury.io/js/serverless-azure-functions.svg)](https://www.npmjs.com/package/serverless-azure-functions)

<!-- [![Node Integration Tests](https://github.com/serverless/serverless-azure-functions/workflows/Node%20Integration%20Tests/badge.svg)](https://github.com/serverless/serverless-azure-functions/actions?query=workflow%3A%22Node+Integration+Tests%22) [![Python Integration Tests](https://github.com/serverless/serverless-azure-functions/workflows/Python%20Integration%20Tests/badge.svg)](https://github.com/serverless/serverless-azure-functions/actions?query=workflow%3A%22Python+Integration+Tests%22) [![.NET Integration Tests](https://github.com/serverless/serverless-azure-functions/workflows/.NET%20Integration%20Tests/badge.svg)](https://github.com/serverless/serverless-azure-functions/actions?query=workflow%3A%22.NET+Integration+Tests%22) -->

## Quickstart

### Pre-requisites

1. Node.js 8.x or above
2. Serverless CLI `v1.9.0+`. You can run `npm i -g serverless` if you don't already have it.
3. An Azure account. If you don't already have one, you can sign up for a [free trial](https://azure.microsoft.com/en-us/free/) that includes $200 of free credit.

### Create a new Azure Function App

```bash
# Create Azure Function App from template
# Templates include: azure-nodejs, azure-python, azure-dotnet
$ sls create -t azure-nodejs -p <appName>
# Move into project directory
$ cd <appName>
# Install dependencies (including this plugin)
$ npm install
```

The `serverless.yml` file contains the configuration for your service. For more details on its configuration, see [the docs](docs/CONFIG.md).

### Running Function App Locally (`offline` plugin)

At the root of your project directory, run:

```bash
# Builds necessary function bindings files and starts the function app
$ sls offline
```

The `offline` process will generate a directory for each of your functions, which will contain a file titled `function.json`. This will contain a relative reference to your handler file & exported function from that file as long as they are referenced correctly in `serverless.yml`.

After the necessary files are generated, it will start the function app from within the same shell. For HTTP functions, the local URLs will be displayed in the console when the function app is initialized.

To build the files *without* spawning the process to start the function app, run:

```bash
$ sls offline build
```

To simply start the function app *without* building the files, run:

```bash
$ sls offline start
```

To clean up files generated from the build, run:

```bash
$ sls offline cleanup
```

To pass additional arguments to the spawned `func host start` process, add them as the option `spawnargs` (shortcut `a`). Example:

```bash
$ sls offline -a "--cors *"
```

This works for `sls offline` or `sls offline start`

### Dry-Run Deployment

Before you deploy your new function app, you may want to double check the resources that will be created, their generated names and other basic configuration info. You can run:

```bash
# -d is short for --dryrun
$ sls deploy --dryrun
```

This will print out a basic summary of what your deployed service will look like.

For a more detailed look into the generated ARM template for your resource group, add the `--arm` (or `-a`) flag:

```bash
$ sls deploy --dryrun --arm
```

### Deploy Your Function App

Deploy your new service to Azure! The first time you do this, you will be asked to authenticate with your Azure account, so the `serverless` CLI can manage Functions on your behalf. Simply follow the provided instructions, and the deployment will continue as soon as the authentication process is completed.

```bash
$ sls deploy
```

For more advanced deployment scenarios, see our [deployment docs](docs/DEPLOY.md)

### Get a Summary of Your Deployed Function App

To see a basic summary of your application (same format as the dry-run summary above), run:

```bash
$ sls info
```

To look at the ARM template for the last successful deployment, add the `--arm` (or `-a`) flag:

```bash
$ sls info --arm
```

You can also get information services with different stages, regions or resource groups by passing any of those flags. Example:

```bash
$ sls info --stage prod --region westus2
```

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
$ sls invoke -f hello -d '{"name": "Azure"}'
```

If you have a JSON object in a file, you could run

```bash
$ sls invoke -f hello -p data.json
```

If you have your service running locally (in another terminal), you can run:

```bash
$ sls invoke local -f hello -p data.json
```

If you configured your function app to [run with APIM](./docs/examples/apim.md), you can run:

```bash
$ sls invoke apim -f hello -p data.json
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

You will then be prompted to enter the full name of the resource group as an extra safety before deleting the entire resource group.

You can bypass this check by running:

```bash
$ sls remove --force
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
    $ az ad sp create-for-rbac --name <my-unique-name>
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
4. Set environment variables **with values from above service principal**

    **Bash**
    ```bash
    $ export AZURE_SUBSCRIPTION_ID='<subscriptionId (see above, step 2)>'
    $ export AZURE_TENANT_ID='<tenantId>'
    $ export AZURE_CLIENT_ID='<servicePrincipalId>'
    $ export AZURE_CLIENT_SECRET='<password>'
    ```

    **Powershell**
    ```powershell
    $env:AZURE_SUBSCRIPTION_ID='<subscriptionId (see above, step 2)>'
    $env:AZURE_TENANT_ID='<tenantId>'
    $env:AZURE_CLIENT_ID='<servicePrincipalId>'
    $env:AZURE_CLIENT_SECRET='<password>'
    ```

### Example Usage
- **[Visit our sample repos](docs/examples/samples.md) for full projects with different use cases**
- [Configuring API Management](docs/examples/apim.md) that sits in front of function app

### Logging Verbosity

You can set the logging verbosity with the `--verbose` flag. If the `--verbose` flag is set with no value, logging will be as verbose as possible (debug mode). You can also provide a value with the flag to set the verbosity to a specific level:

- `--verbose error` - Only error messages printed
- `--verbose warn` - Only error and warning messages printed
- `--verbose info` - Only error, warning and info messages printed
- `--verbose debug` - All messages printed

### Contributing

Please create issues in this repo for any problems or questions you find. Before sending a PR for any major changes, please create an issue to discuss.

We're still in the process of getting everying running 100%, but please refer to the [Serverless contributing guidlines](CONTRIBUTING.md) for information on how to contribute and code of conduct.

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

#### Integration Tests

We run our integration tests twice per day from our GitHub workflow. These tests install the beta version of the plugin, deploy a function app (with APIM), re-deploy (to make sure ARM template deployment is skipped), invoke the function directly, invoke the APIM endpoint and then remove the resource group, making assertions on the output at each step. While the number of configurations one could use in the Serverless Framework is virtually infinite, we tried to capture the main runtimes and platforms that are supported by the tool:

- Node 12 on Linux using remote build
- Node 12 on Linux using external package
- Node 12 on Linux using remote build and premium functions
- Node 12 on Windows
- Node 12 on Windows using premium functions
- Node 12 on Windows using webpack
- Node 14 on Windows
- Node 14 on Windows using premium functions
- Node 14 on Windows using webpack
- Node 16 on Windows
- Node 16 on Windows using premium functions
- Node 16 on Windows using webpack
- Python 3.6 (Linux only)
- Python 3.6 (Linux only) using premium functions
- Python 3.7 (Linux only)
- Python 3.8 (Linux only)
- .NET Core 2.2 on Linux
- .NET Core 2.2 on Windows
- .NET Core 3.1 on Linux
- .NET Core 3.1 on Windows

We made these configurations as minimal as possible. If you are having problems with your project, feel free to check to see if our integration tests are passing (see badge at top of readme) and then double check our configuration inside the `integrationTests` directory.

We use [Clover](https://www.npmjs.com/package/clvr) to run the integration tests, and they run 2x per day in our GitHub Action, split out by runtime language.

#### Signing commits

All commits in your Pull Request will need to be signed. When looking at the commits in the pull request, you will see a green 'verified' icon next to your commit. Commit signature verification is discussed [here](https://help.github.com/en/articles/about-commit-signature-verification).

Follow the directions [here](https://help.github.com/en/articles/signing-commits) to configure commit signing.

If any of your commits are not signed, your pull request will not be able to be merged into the base branch. You can fix this by squashing any unsigned commits into signed commits using an interactive rebase, and force pushing your new commit history. More detail [here](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History).

When using Windows you may also encounter an error when trying to sign a commit, stating that a security key could not be found. Ensure that you have set the path the gpg in the git config: `git config --global gpg.program "C:\Program Files (x86)\GnuPG\bin\gpg.exe"`

## License

[MIT](LICENSE)
