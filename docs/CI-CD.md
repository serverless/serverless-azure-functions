# Overview

CI/CD setup on Azure DevOps

## Unit Tests CI

1. Unit tests auto run on all PRs targeting `dev` and `master`
1. Unit tests are run against 3 different os and 2 node versions, for a total of 6 build
   * Mac + Node 8
   * Windows + Node 8
   * Linux + Node 8
   * Mac + Node 10
   * Windows + Node 10
   * Linux + Node 10
1. The pipeline describing this set up is in `pipelines/ci.yml`
1. Coverage report is uploaded to `coveralls` in one of the build - Linux + Node 8
