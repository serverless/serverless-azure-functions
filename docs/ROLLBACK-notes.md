# Rollback Plugin

- AWS has two different kinds of rollback:
  - Roll back application to timestamp
    ```bash
    # List all deployments
    sls deploy list
    # Serverless: -------------
    # Serverless: Timestamp: 1476790110568
    # Serverless: Datetime: 2018T11:28:30.568Z
    # Serverless: Files:
    # Serverless: - compiled-cloudformation-template.json
    # Serverless: - mail-service.zip
    # Serverless: -------------
    # Serverless: Timestamp: 1476889476243
    # Serverless: Datetime: 2019T15:04:36.243Z
    # Serverless: Files:
    # Serverless: - compiled-cloudformation-template.json
    # Serverless: - mail-service.zip
    # Serverless: -------------
    sls rollback --timestamp 1476790110568
    ```
  - Roll back specific function to a specific version
    ```bash
    sls rollback function -f my-function -v 23
    ```
- Functions must have been previously deployed, so I assume that means the rollback happens for the deployment, not the source control
- Azure Functions would not be able to support rolling back individual functions (TODO: Verify with Azure Functions team)
- Question: Is our current deployment auto-versioned? If we were to roll back based on version, what would that look like?
- We need a `serverless deploy list` command
  - AWS Pulls all deployments from S3 bucket
  - Is there a way for Azure to list all deployments without storing them separately in my own blob storage?
    - Yes, in the [web apps operations](https://raw.githubusercontent.com/Azure/azure-sdk-for-js/9bcb4c59d1f265def04942a812485683229da870/sdk/appservice/arm-appservice/src/operations/webApps.ts). Search `listDeployments`.
- Should investigate the "run from package" option if it makes sense - would make it easier for rollback
