# Serverless Configuration

This document serves as a basic outline for configuring your Azure Function App through `serverless.yml`

## Function Runtime

### Operating System:

#### Supported Operating Systems:
- `windows`
- `linux`

#### How to specify operating system:
```yaml
...
provider:
  os: linux
...
```
Default is windows

### Language

#### Supported Languages:
- node
- python

#### How to specify language:

```yaml
...
provider:
  runtime: nodejs10.x
...
```

All supported runtimes can be found [in this file](https://github.com/serverless/serverless-azure-functions/blob/master/src/services/runtimeVersions.json). The notation `.x` signifies to use the highest version within that major or minor release.

**Note**: Azure functions only supports Python 3.6. Specify that by using `python3.6`
