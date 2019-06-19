# Rollback

##### `sls rollback`
- Description - Roll back deployment of Function App & Resource Group
- Options:
  - `-t` or `--timestamp` - Timestamp associated with version to target
  - `-v` or `--version` - Version of function app
  - Use `sls deploy list` to discover timestamps and versions
  - Defaults to previous deployment and version number
- Important to note that there is no option for rolling back an individual function. A function app is considered one unit and will be rolled back as such.
- Open questions:
  - How to ensure rollback to corresponding ARM deployment and function app from blob storage? Custom named deployments containing version number?

##### Sequence diagram for rollback

```mermaid
sequenceDiagram
  participant s as Serverless CLI
  participant r as Resource Group 
  participant f as Function App
  participant b as Blob Storage

  note right of s: `sls rollback`
  s ->> r: Request deployments
  r ->> s: Return deployments
  note right of s: Select deployment
  s ->> r: Deploy ARM template
  s ->> b: Request names of previously deployed artifacts
  b ->> s: Return names
  note right of s: Select artifact
  s ->> f: Update RUN_FROM_PACKAGE path
  note right of s: Log URLs
```
