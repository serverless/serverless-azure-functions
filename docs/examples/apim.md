# API Management

[API Management](https://azure.microsoft.com/en-us/services/api-management/) is an Azure Service for publishing, managing, securing and monitoring APIs. It can be deployed along with your Serverless function app by specifying its configuration in `serverless.yml`. Here is a basic example of how to configure API Mangement:

## Simple Configuration
Simply by setting `apim: true` in your configuration a consumption based APIM resource will automatically be deployed to Azure.  By default it will create a API with path of `/api` in your APIM instance and will map all operations defined in the serverless yaml to your function app

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
  apim: true

plugins:
  - serverless-azure-functions

functions:
  hello:
    handler: src/handlers/hello.handler
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

## Full Configuration
In this example you can see the configuration support is quite verbose.  You have the ability to create multiple APIs and Backends as well as associate an operation to a specific api/backend.  If the operation is not specifically defined it will default to the first API / Backend that has been defined.
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
    apis:
        # Name of the API
      - name: products-api
        subscriptionRequired: false
        # Display name
        displayName: Products API
        # Description of API
        description: The Products REST API
        # HTTP protocols allowed
        protocols:
          - https
        # Base path of API calls
        path: products
        # Tags for ARM resource
        tags:
          - tag1
          - tag2
        # No authorization
        authorization: none
        # Name of the API
      - name: categories-api
        subscriptionRequired: false
        # Display name
        displayName: Categories API
        # Description of API
        description: The Categories REST API
        # HTTP protocols allowed
        protocols:
          - https
        # Base path of API calls
        path: categories
        # Tags for ARM resource
        tags:
          - tag1
          - tag2
        # No authorization
        authorization: none
    backends:
      - name: products-backend
        url: api/products
      - name: categories-backend
        url: api/categories
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
  getProducts:
    handler: src/handlers/getProducts.handler

    # API Management configuration for `hello` handler
    apim:
      # The API to attach this operation
      api: products-api
      # The Backend use for the operation
      backend: products-backend
      operations:
        # GET operation for `getProducts` handler
        - method: get
          # URL path for accessing handler
          urlTemplate: /
          # Display name inside Azure Portal
          displayName: GetProducts
    events:
      - http: true
        x-azure-settings:
          methods:
            - GET
          authLevel : function
  getCategories:
    handler: src/handlers/getCategories.handler

    # API Management configuration for `getCategories` handler
    apim:
      # The API to attach this operation
      api: categories-api
      # The Backend use for the operation
      backend: categories-backend
      operations:
        # GET operation for `getCategories` handler
        - method: get
          # URL path for accessing handler
          urlTemplate: /
          # Display name inside Azure Portal
          displayName: GetCategories
    events:
      - http: true
        x-azure-settings:
          methods:
            - GET
          authLevel : function
```
