# Deploy

##### `sls deploy`
- Description: Deploy resource group containing function app and other resources. Also deploys Function App code
- Two Approaches:
  - Deploy resource group, upload packaged artifact directly to function app. Sets function app `RUN_FROM_PACKAGE` setting to `1`.
  - Deploy resource group, upload packaged function app to blob storage with version name. Sets function app `RUN_FROM_PACKAGE` setting to path of zipped artifact in blob storage
- Open Questions:
  - Default to deploy to blob storage? Default to zip deploy directly to function app?
  - Container name for code artifacts? Hard coded? Configurable? Default to ARTIFACTS?
  - Version name conflicts simply overwrite previous artifact?

##### Sequence diagram for deployment to blob storage


```mermaid
sequenceDiagram
  participant s as Serverless CLI
  participant r as Resource Group 
  participant f as Function App
  participant b as Blob Storage

  note right of s: `sls deploy`
  s ->> r: Create resource group
  s ->> r: Deploy ARM template
  r ->> f: Included in ARM template
  r ->> b: Included in ARM template
  note right of s: Zip code
  s ->> b: Deploy zip code with name {appName}-v{version}.zip
  s ->> f: Set package path in settings
  note right of s: Log URLs 
```


##### Sub-Commands

- `sls deploy list` - Logs list of deployments to configured resource group with relevant metadata (name, timestamp, etc.). Also logs versions of deployed function app code if available


