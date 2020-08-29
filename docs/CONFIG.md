# Serverless Configuration

This document serves as a basic outline for configuring your Azure Function App through `serverless.yml`.

- `service` - Name of service. Used to generate name for resource group, function app, and other resources

## Provider Configuration

- `provider.name` - Name of serverless provider. Always `azure`
- `provider.os` - Operating system for function app. Available options:
    - `windows` (default)
    - `linux`
- `provider.runtime` - Runtime language for function app. Available options (no default, must be specified):
    - `nodejs10`
    - `nodejs12`
    - `python3.6` (forced to use `linux`)
    - `python3.7` (forced to use `linux`)
    - `python3.8` (forced to use `linux`)
    - `dotnet2.2`
    - `dotnet3.1`
- `provider.region` - [Azure region](https://azure.microsoft.com/en-us/global-infrastructure/regions/) for resources
- `provider.prefix` - Prefix used in naming convention for resources. Default `sls`
- `provider.stage` - Stage for resources. Default `dev`
- `provider.type` - Type of Azure Function app
  - `consumption` (default)
  - `premium`
  - `ase`
- `provider.subscriptionId` - Azure subscription ID. Can also be specified by environment variable (`AZURE_SUBSCRIPTION_ID`) or command-line args (`--subscriptionId`)
- `provider.tenantId` - Azure subscription ID. Can also be specified by environment variable (`AZURE_TENANT_ID`) or command-line args (`--tenantId`)
- `provider.appId` - Azure subscription ID. Can also be specified by environment variable (`AZURE_CLIENT_ID`) or command-line args (`--appId`)
- `provider.tags` - Tags to apply to resource group
  ```yaml
  provider:
    tags:
      tagName: tagValue
  ```
- `provider.deployment` - Deployment configuration
  - `provider.deployment.external` - Publishes function app by uploading to blob storage and executes a sync triggers command
  - `provider.deployment.rollback` - Enables the rollback scenario by timestamping deployments and artifacts. (Default true)
  - `provider.deployment.container` - Optional specification of container name for zipped code artifacts
- `provider.{resource}.name` - Specify name of resource for the Azure resource types
- `provider.{resource}.sku.name` - Specify name of the sku for the Azure resource types
- `provider.{resource}.sku.tier` - Specify tier of the sku for the Azure resource types
- Azure resource types 👆
  - `functionApp`
  - `appInsights`
  - `appServicePlan`
  - `storageAccount`
  - `hostingEnvironment`
  - `virtualNetwork`
  - `keyVaultConfig` (can only specify `name` or `resourceGroup`)
- `provider.deploymentName` - Specification of deployment name
- `provider.armTemplate` - Specification of ARM template to use
    ```yaml
    provider:
      armTemplate:
        file: "pathToArmTemplate.json"
        parameters:
          param1: value1
          param2: value2
    ```
- `provider.environment` - Key value pairs to set as app settings (environment variables) within function app. Example:
    ```yaml
    provider:
      environment:
        VARIABLE_FOO: 'bar'
    ```
- `provider.apim` - APIM Configuration. See [documentation](../docs/examples/apim.md) for more details 

## Plugin Configuration

- `plugins` - List of plugins used by service. Must always include:
    `- serverless-azure-functions`

## Package Configuration

- `package.include` - Files or folders to include in package
- `package.exclude` - Files or folders to exclude from package

## Functions Configuration

Example:

```yaml
functions:
  hello:
    # Handler is in src/handlers/hello.js and function sayHello
    handler: src/handlers/hello.sayHello
    events:
      # Http Triggered function
      - http: true
        # Allows GET method
        methods:
          - GET
        authLevel: anonymous # can also be `function` or `admin`
```

## Full Example Config

```yaml
# Welcome to Serverless!
#
# This file is the main config file for your service.
# It's very minimal at this point and uses default values.
# You can always add more config options for more control.
# We've included some commented out config examples here.
# Just uncomment any of them to get that config option.
#
# For full config options, check the docs:
#    docs.serverless.com
#
# Happy Coding!

service: my-api

# You can pin your service to only deploy with a specific Serverless version
# Check out our docs for more details
# frameworkVersion: "=X.X.X"

provider:
  name: azure
  region: West Europe
  runtime: nodejs10.x
  prefix: "sample"  # prefix of generated resource name
  # subscriptionId: A356AC8C-E310-44F4-BF85-C7F29044AF99
  # stage: dev
  # type: premium  # premium azure functions

  environment: # these will be created as application settings
    VARIABLE_FOO: 'foo'

  # you can define apim configuration here
  # apim:
  #   apis:
  #     - name: v1
  #       subscriptionRequired: false # if true must provide an api key
  #       displayName: v1
  #       description: V1 sample app APIs
  #       protocols:
  #         - https
  #       path: v1
  #       tags:
  #         - tag1
  #         - tag2
  #       authorization: none
  #   cors:
  #     allowCredentials: false
  #     allowedOrigins:
  #       - "*"
  #     allowedMethods:
  #       - GET
  #       - POST
  #       - PUT
  #       - DELETE
  #       - PATCH
  #     allowedHeaders:
  #       - "*"
  #     exposeHeaders:
  #       - "*"

plugins: # look for additional plugins in the community plugins repo: https://github.com/serverless/plugins
  - serverless-azure-functions

# you can add packaging information here
package:
  # include:
  #   - include-me.js
  #   - include-me-dir/**
  exclude:
    # - exclude-me.js
    # - exclude-me-dir/**
    - local.settings.json
    - .vscode/**

functions:
  hello:
    handler: src/handlers/hello.sayHello
    events:
      - http: true
        methods:
          - GET
        authLevel: anonymous # can also be `function` or `admin`

  goodbye:
    handler: src/handlers/goodbye.sayGoodbye
    events:
      - http: true
        methods:
          - GET
        authLevel: anonymous
  # The following are a few examples of other events you can configure:
  # storageBlob:
  #   handler: src/handlers/storageBlob.printMessage
  #   events:
  #     - blob:
#         name: blob # Specifies which name is available on `context`
#         path: blob-sample/{blobName}
#         connection: AzureWebJobsStorage # App Setting/environment variable which contains Storage Account Connection String
  # storageQueue:
  #   handler: src/handlers/storageQueue.printMessage
  #   events:
  #     - queue: queue-sample
#         name: message # Specifies which naem is available on `context`
#         connection: AzureWebJobsStorage
  # timer:
  #   handler: src/handlers/timer.printMessage
  #   events:
  #     - timer:
#         schedule: '*/10 * * * * *'
  # eventhub:
  #   handler: src/handlers/eventHub.printMessage
  #   events:
  #     - eventHub:
#         name: eventHubMessages # Specifies which name it's available on `context`
#         eventHubName: sample-hub # Specifies the Name of the Event Hub
#         consumerGroup: $Default # Specifies the consumerGroup to listen with
#         connection: EVENT_HUBS_CONNECTION # App Setting/environment variable which contains Event Hubs Namespace Connection String
  # serviceBusQueue:
  #   handler: src/handlers/serviceBusQueue.printMessage
  #   events:
  #     - serviceBus:
#         name: message # Specifies which name is available on `context`
#         queueName: sample-queue # Name of the service bus queue to consume
#         connection: SERVICE_BUS_CONNECTION # App Setting/environment variable variable which contains Service Bus Namespace Connection String
  # serviceBusTopic:
  #   handler: src/handlers/serviceBusTopic.printMessage
  #   events:
  #     - serviceBus:
#         name: message # Specifies which name it's available on `context`
#         topicName: sample-topic # Name of the service bus topic to consume
#         subscriptionName: sample-subscription # Name of the topic subscription to retrieve from
#         connection: SERVICE_BUS_CONNECTION # App Setting/environment variable variable which contains Service Bus Namespace Connection String

```
