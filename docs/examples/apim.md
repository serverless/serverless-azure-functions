# API Management

[API Management](https://azure.microsoft.com/en-us/services/api-management/) is an Azure Service for publishing, managing, securing and monitoring APIs. It can be deployed along with your Serverless function app by specifying its configuration in `serverless.yml`. Here is a basic example of how to configure API Mangement:

## Simple Handler

```yaml
service: greeter

provider:
  prefix: greeter
  name: azure
  # Default to West US, allow for command line arg --region to override
  region: ${opt:region, 'westus'}
  # Default to dev, allow for command line arg -- stage to override
  stage: ${opt:stage, 'dev'}
  # Azure subscription ID for deployment
  subscriptionId: 00000000-0000-0000-0000-000000000000

  # Start of your API Management configuration
  apim:
    # API specifications
    api:
      # Name of the API
      name: v1
      subscriptionRequired: false
      # Display name
      displayName: v1
      # Description of API
      description: V1 sample app APIs
      # HTTP protocols allowed
      protocols:
        - https
      # Base path of API calls
      path: v1
      # Tags for ARM resource
      tags:
        - tag1
        - tag2
      # No authorization
      authorization: none
    # CORS Settings for APIM
    cors:
      allowCredentials: false
      allowedOrigins:
        - "*"
      allowedMethods:
        - GET
        - POST
        - PUT
        - DELETE
        - PATCH
      allowedHeaders:
        - "*"
      exposeHeaders:
        - "*"

plugins:
  - serverless-azure-functions

functions:
  hello:
    handler: src/handlers/hello.handler

    # API Management configuration for `hello` handler
    apim:
      operations:
        # GET operation for `hello` handler
        - method: get
          # URL path for accessing handler
          urlTemplate: /hello
          # Display name inside Azure Portal
          displayName: Hello
    events:
      - http: true
        x-azure-settings:
          methods:
            - GET
          authLevel : function
      - http: true
        x-azure-settings:
          direction: out
          name: res
```
