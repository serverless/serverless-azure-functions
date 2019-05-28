export const originalSlsYml = `provider:
name: azure
location: West US 2

plugins:
  - serverless-azure-functions

functions:
  hello:
    handler: hello/index.handler
    events:
      - http: true
        x-azure-settings:
          authLevel: anonymous
      - http: true
        x-azure-settings:
          direction: out
          name: res
  goodbye:
    handler: goodbye/index.handler
    events:
      - http: true
        x-azure-settings:
          authLevel: anonymous
      - http: true
        x-azure-settings:
          direction: out
          name: res
`

export const additionalFunctionYml = `functions:
  hello:
    handler: hello/index.handler
    events:
      - http: true
        x-azure-settings:
          authLevel: anonymous
      - http: true
        x-azure-settings:
          direction: out
          name: res
  goodbye:
    handler: goodbye/index.handler
    events:
      - http: true
        x-azure-settings:
          authLevel: anonymous
      - http: true
        x-azure-settings:
          direction: out
          name: res
  greetings:
    handler: greetings/index.handler
    events:
      - http: true
        x-azure-settings:
          authLevel: anonymous
      - http: true
        x-azure-settings:
          direction: out
          name: res


`

export const additionalFunctionSlsYml = `provider:
name: azure
location: West US 2

plugins:
  - serverless-azure-functions

functions:
  hello:
    handler: hello/index.handler
    events:
      - http: true
        x-azure-settings:
          authLevel: anonymous
      - http: true
        x-azure-settings:
          direction: out
          name: res
  goodbye:
    handler: goodbye/index.handler
    events:
      - http: true
        x-azure-settings:
          authLevel: anonymous
      - http: true
        x-azure-settings:
          direction: out
          name: res
  greetings:
    handler: greetings/index.handler
    events:
      - http: true
        x-azure-settings:
          authLevel: anonymous
      - http: true
        x-azure-settings:
          direction: out
          name: res
`