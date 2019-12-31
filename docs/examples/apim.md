# API Management

[API Management](https://azure.microsoft.com/en-us/services/api-management/) is an Azure Service for publishing, managing, securing and monitoring APIs. It can be deployed along with your Serverless function app by specifying its configuration in `serverless.yml`. Here is a basic example of how to configure API Mangement:

## Simple Configuration
Simply setting `apim: true` in your configuration will automatically deploy a consumption based APIM resource to Azure.  By default it will create a API with path of `/api` in your APIM instance and will map all operations defined in the serverless yaml to your function app.

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
        methods:
          - GET
        authLevel : function
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

    # JWT validation APIM policy
    jwtValidate:
      headerName: authorization
      scheme: bearer
      failedStatusCode: 401
      failedErrorMessage: "Authorization token is missing or invalid"
      openId:
        metadataUrl: "https://path/to/openid/metadata/config"
      audiences:
        - "audience1"
        - "audience2"
      issuers:
        - "https://path/to/openid/issuer"

    # Header validation APIM policy
    checkHeaders:
      - headerName: x-example-header-1
        failedStatusCode: 400
        failedErrorMessage: Not Authorized
        values: # List of allowed values, otherwise returns error code/message
          - value1
          - value2
      - headerName: x-example-header-2
        failedStatusCode: 403
        failedErrorMessage: Forbidden
        values: # List of allowed values, otherwise returns error code/message
          - value1
          - value2

    # IP Validation APIM policies
    ipFilters:
      - action: allow
        addresses: # List of allowed IP addresses
          - 1.1.1.1
          - 2.2.2.2
        addressRange: # Also optionally support range of IP addresses
          from: 1.1.1.1
          to: 2.2.2.2
      - action: forbid
        addresses: # List of forbidden IP addresses
          - 3.3.3.3
          - 4.4.4.4
        addressRange: # Also optionally support range of IP addresses
          from: 3.3.3.3
          to: 4.4.4.4



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
        methods:
          - GET
        authLevel : function
```
