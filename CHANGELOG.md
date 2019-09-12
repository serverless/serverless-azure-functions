# [1.0.0-46](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-45...v1.0.0-46) (2019-09-10)


### Bug Fixes

* Create default .azure directory if not present ([#318](https://github.com/serverless/serverless-azure-functions/issues/318)) ([d5fd387](https://github.com/serverless/serverless-azure-functions/commit/d5fd387))



# [1.0.0-45](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-44...v1.0.0-45) (2019-09-10)


### Bug Fixes

* Fix failing invoke with data path ([#321](https://github.com/serverless/serverless-azure-functions/issues/321)) ([7adf5d6](https://github.com/serverless/serverless-azure-functions/commit/7adf5d6)), closes [#320](https://github.com/serverless/serverless-azure-functions/issues/320)



# [1.0.0-44](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-43...v1.0.0-44) (2019-09-09)


### Bug Fixes

* Throw original error if no previous deployments ([#324](https://github.com/serverless/serverless-azure-functions/issues/324)) ([6787f59](https://github.com/serverless/serverless-azure-functions/commit/6787f59))



# [1.0.0-43](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-42...v1.0.0-43) (2019-09-09)


### Bug Fixes

* Exclude ARM params with null values ([#325](https://github.com/serverless/serverless-azure-functions/issues/325)) ([1068a4b](https://github.com/serverless/serverless-azure-functions/commit/1068a4b))



# [1.0.0-42](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-41...v1.0.0-42) (2019-09-09)


### Bug Fixes

* Invoke offline without requiring global install ([#322](https://github.com/serverless/serverless-azure-functions/issues/322)) ([6d99369](https://github.com/serverless/serverless-azure-functions/commit/6d99369))



# [1.0.0-41](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-40...v1.0.0-41) (2019-09-06)


### Bug Fixes

* Fix regression of skipping identical ARM deployment ([#314](https://github.com/serverless/serverless-azure-functions/issues/314)) ([dbdb084](https://github.com/serverless/serverless-azure-functions/commit/dbdb084))



# [1.0.0-40](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-39...v1.0.0-40) (2019-09-06)


### Bug Fixes

* add resource group name hash to resource names ([#310](https://github.com/serverless/serverless-azure-functions/issues/310)) ([5ba9508](https://github.com/serverless/serverless-azure-functions/commit/5ba9508)), closes [#311](https://github.com/serverless/serverless-azure-functions/issues/311)



# [1.0.0-39](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-38...v1.0.0-39) (2019-09-06)



# [1.0.0-38](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-37...v1.0.0-38) (2019-09-06)


### Features

* APIM feature updates ([#312](https://github.com/serverless/serverless-azure-functions/issues/312)) ([c679b73](https://github.com/serverless/serverless-azure-functions/commit/c679b73))



# [1.0.0-37](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-36...v1.0.0-37) (2019-09-05)


### Bug Fixes

* Updates default http output binding ([#308](https://github.com/serverless/serverless-azure-functions/issues/308)) ([72bc900](https://github.com/serverless/serverless-azure-functions/commit/72bc900)), closes [Azure/azure-functions-nodejs-worker#228](https://github.com/Azure/azure-functions-nodejs-worker/issues/228)



# [1.0.0-36](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-35...v1.0.0-36) (2019-09-05)


### Bug Fixes

* Move service initialization outside of plugins ([#301](https://github.com/serverless/serverless-azure-functions/issues/301)) ([e857be8](https://github.com/serverless/serverless-azure-functions/commit/e857be8))



# [1.0.0-35](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-34...v1.0.0-35) (2019-09-04)


### Bug Fixes

* Add backwards compatibility for location/region keys in config ([#305](https://github.com/serverless/serverless-azure-functions/issues/305)) ([12e1235](https://github.com/serverless/serverless-azure-functions/commit/12e1235)), closes [#280](https://github.com/serverless/serverless-azure-functions/issues/280)


### Features

* More detailed error message upon ARM deployment failure ([#306](https://github.com/serverless/serverless-azure-functions/issues/306)) ([1c6eb50](https://github.com/serverless/serverless-azure-functions/commit/1c6eb50))



# [1.0.0-34](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-33...v1.0.0-34) (2019-09-04)


### Features

* Azure Key Vault YAML setup support ([#285](https://github.com/serverless/serverless-azure-functions/issues/285)) ([0ee7167](https://github.com/serverless/serverless-azure-functions/commit/0ee7167))



# [1.0.0-33](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-32...v1.0.0-33) (2019-09-04)


### Bug Fixes

* Log correct function app name in deployment ([#304](https://github.com/serverless/serverless-azure-functions/issues/304)) ([09615ee](https://github.com/serverless/serverless-azure-functions/commit/09615ee))



# [1.0.0-32](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-31...v1.0.0-32) (2019-09-03)


### Bug Fixes

* Combine rollback log statement into one string ([#290](https://github.com/serverless/serverless-azure-functions/issues/290)) ([5806757](https://github.com/serverless/serverless-azure-functions/commit/5806757))



# [1.0.0-31](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-30...v1.0.0-31) (2019-09-03)


### Features

* Use development storage for offline build ([#296](https://github.com/serverless/serverless-azure-functions/issues/296)) ([4a54f1b](https://github.com/serverless/serverless-azure-functions/commit/4a54f1b))



# [1.0.0-30](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-29...v1.0.0-30) (2019-08-30)


### Bug Fixes

* Don't throw error if subscription ID already specified ([#295](https://github.com/serverless/serverless-azure-functions/issues/295)) ([ea7678d](https://github.com/serverless/serverless-azure-functions/commit/ea7678d))



# [1.0.0-29](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-28...v1.0.0-29) (2019-08-30)


### Bug Fixes

* Clean up downloaded artifact after rollback ([#289](https://github.com/serverless/serverless-azure-functions/issues/289)) ([b55b637](https://github.com/serverless/serverless-azure-functions/commit/b55b637)), closes [#287](https://github.com/serverless/serverless-azure-functions/issues/287)


### Features

* Wait longer and only print one retry message for deploying a function app ([#283](https://github.com/serverless/serverless-azure-functions/issues/283)) ([9a8f4af](https://github.com/serverless/serverless-azure-functions/commit/9a8f4af))



# [1.0.0-28](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-27...v1.0.0-28) (2019-08-30)



# [1.0.0-27](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-26...v1.0.0-27) (2019-08-30)



# [1.0.0-26](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-25...v1.0.0-26) (2019-08-30)


### Bug Fixes

* Fix appServicePlan name and functionApp name ([#293](https://github.com/serverless/serverless-azure-functions/issues/293)) ([dc67996](https://github.com/serverless/serverless-azure-functions/commit/dc67996)), closes [#292](https://github.com/serverless/serverless-azure-functions/issues/292)



# [1.0.0-25](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-24...v1.0.0-25) (2019-08-29)


### Bug Fixes

* Fix compiler errors and remove logs plugin ([#286](https://github.com/serverless/serverless-azure-functions/issues/286)) ([90f71a9](https://github.com/serverless/serverless-azure-functions/commit/90f71a9))



# [1.0.0-24](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-23...v1.0.0-24) (2019-08-29)


### Bug Fixes

* Clean up .serverless folder before packaging new artifact ([#275](https://github.com/serverless/serverless-azure-functions/issues/275)) ([225a905](https://github.com/serverless/serverless-azure-functions/commit/225a905))



# [1.0.0-23](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-22...v1.0.0-23) (2019-08-29)


### Bug Fixes

* Remove dead, outdated AzureProvider code ([#276](https://github.com/serverless/serverless-azure-functions/issues/276)) ([6778eb8](https://github.com/serverless/serverless-azure-functions/commit/6778eb8))



# [1.0.0-22](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-21...v1.0.0-22) (2019-08-29)


### Bug Fixes

* Use stage, region, resourceGroup and prefix from CLI options ([#284](https://github.com/serverless/serverless-azure-functions/issues/284)) ([506ebc6](https://github.com/serverless/serverless-azure-functions/commit/506ebc6)), closes [#280](https://github.com/serverless/serverless-azure-functions/issues/280) [#282](https://github.com/serverless/serverless-azure-functions/issues/282) [#281](https://github.com/serverless/serverless-azure-functions/issues/281)



# [1.0.0-21](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-20...v1.0.0-21) (2019-08-29)


### Bug Fixes

* Throw error if user tries to specify package.individually ([#263](https://github.com/serverless/serverless-azure-functions/issues/263)) ([d107a72](https://github.com/serverless/serverless-azure-functions/commit/d107a72)), closes [#254](https://github.com/serverless/serverless-azure-functions/issues/254)



# [1.0.0-20](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-19...v1.0.0-20) (2019-08-28)



# [1.0.0-19](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-18...v1.0.0-19) (2019-08-28)


### Bug Fixes

* Don't remove local.settings.json in offline cleanup ([#267](https://github.com/serverless/serverless-azure-functions/issues/267)) ([9cc06b5](https://github.com/serverless/serverless-azure-functions/commit/9cc06b5))



# [1.0.0-18](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-17...v1.0.0-18) (2019-08-28)


### Bug Fixes

* set up npm auth ([#272](https://github.com/serverless/serverless-azure-functions/issues/272)) ([401e74c](https://github.com/serverless/serverless-azure-functions/commit/401e74c))



# [1.0.0-17](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-16...v1.0.0-17) (2019-08-28)



# [1.0.0-16](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-15...v1.0.0-16) (2019-08-28)



# [1.0.0-15](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-14...v1.0.0-15) (2019-08-27)


### Bug Fixes

* Move InvokeService variable initialization outside of the constructor header ([#270](https://github.com/serverless/serverless-azure-functions/issues/270)) ([a47e1f8](https://github.com/serverless/serverless-azure-functions/commit/a47e1f8))



# [1.0.0-14](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-13...v1.0.0-14) (2019-08-27)



# [1.0.0-13](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-12...v1.0.0-13) (2019-08-27)


### Features

* Invoke function locally ([#264](https://github.com/serverless/serverless-azure-functions/issues/264)) ([50ff6d9](https://github.com/serverless/serverless-azure-functions/commit/50ff6d9)), closes [#260](https://github.com/serverless/serverless-azure-functions/issues/260)



# [1.0.0-12](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-11...v1.0.0-12) (2019-08-27)


### Bug Fixes

* Append 6-char resource group hash to storage account name ([#256](https://github.com/serverless/serverless-azure-functions/issues/256)) ([44185c5](https://github.com/serverless/serverless-azure-functions/commit/44185c5)), closes [AB#846](https://github.com/AB/issues/846)
* Check for valid entries in token cache remove and find ([#244](https://github.com/serverless/serverless-azure-functions/issues/244)) ([660f8b7](https://github.com/serverless/serverless-azure-functions/commit/660f8b7))
* Crash deployment if function app zip file doesn't exist ([#242](https://github.com/serverless/serverless-azure-functions/issues/242)) ([c79e27f](https://github.com/serverless/serverless-azure-functions/commit/c79e27f))
* Don't require login during packaging. ([c313683](https://github.com/serverless/serverless-azure-functions/commit/c313683)), closes [AB#801](https://github.com/AB/issues/801)
* Don't skip deploy if previous equivalent deployment failed ([#247](https://github.com/serverless/serverless-azure-functions/issues/247)) ([b916e25](https://github.com/serverless/serverless-azure-functions/commit/b916e25)), closes [AB#852](https://github.com/AB/issues/852)
* exclude test files ([#246](https://github.com/serverless/serverless-azure-functions/issues/246)) ([1b35a5d](https://github.com/serverless/serverless-azure-functions/commit/1b35a5d)), closes [AB#804](https://github.com/AB/issues/804)
* Fix bug with invalid token file for interactive login ([#243](https://github.com/serverless/serverless-azure-functions/issues/243)) ([9e3fcac](https://github.com/serverless/serverless-azure-functions/commit/9e3fcac)), closes [AB#838](https://github.com/AB/issues/838)
* Let Serverless Framework handle thrown error ([#238](https://github.com/serverless/serverless-azure-functions/issues/238)) ([de798b6](https://github.com/serverless/serverless-azure-functions/commit/de798b6))
* Register missing dependency ([#237](https://github.com/serverless/serverless-azure-functions/issues/237)) ([1361dc9](https://github.com/serverless/serverless-azure-functions/commit/1361dc9))
* Throw error if user tries to specify function for deployment ([#262](https://github.com/serverless/serverless-azure-functions/issues/262)) ([9b2257d](https://github.com/serverless/serverless-azure-functions/commit/9b2257d)), closes [#258](https://github.com/serverless/serverless-azure-functions/issues/258)


### Features

* Add `hooks` type to base plugin, document plugin options for CLI help ([#245](https://github.com/serverless/serverless-azure-functions/issues/245)) ([22aa4f1](https://github.com/serverless/serverless-azure-functions/commit/22aa4f1)), closes [AB#802](https://github.com/AB/issues/802) [AB#795](https://github.com/AB/issues/795)
* Add azure-functions-core-tools to dependencies ([#261](https://github.com/serverless/serverless-azure-functions/issues/261)) ([b1a7c72](https://github.com/serverless/serverless-azure-functions/commit/b1a7c72))
* Deploy function app code from blob storage URL ([#231](https://github.com/serverless/serverless-azure-functions/issues/231)) ([28d853d](https://github.com/serverless/serverless-azure-functions/commit/28d853d)), closes [AB#488](https://github.com/AB/issues/488)
* Release and pre-release pipelines with publish script ([#224](https://github.com/serverless/serverless-azure-functions/issues/224)) ([7a8a948](https://github.com/serverless/serverless-azure-functions/commit/7a8a948)), closes [AB#588](https://github.com/AB/issues/588)
* Specify Node.js runtime version in serverless.yml ([#257](https://github.com/serverless/serverless-azure-functions/issues/257)) ([8c3c7a9](https://github.com/serverless/serverless-azure-functions/commit/8c3c7a9)), closes [AB#704](https://github.com/AB/issues/704)


### Performance Improvements

* Short-circuit deployment if ARM template hasn't changed ([#239](https://github.com/serverless/serverless-azure-functions/issues/239)) ([327511c](https://github.com/serverless/serverless-azure-functions/commit/327511c)), closes [AB#789](https://github.com/AB/issues/789)
* Skip upload to function app if configured to run from blob ([#241](https://github.com/serverless/serverless-azure-functions/issues/241)) ([20f1579](https://github.com/serverless/serverless-azure-functions/commit/20f1579))



# [1.0.0-11](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-10...v1.0.0-11) (2019-08-08)


### Bug Fixes

* issue fixed to generate the correct function.json for event hub and service bus queue and topic triggers ([#228](https://github.com/serverless/serverless-azure-functions/issues/228)) ([4e46a03](https://github.com/serverless/serverless-azure-functions/commit/4e46a03))
* Removed service name from storage account name generator ([#232](https://github.com/serverless/serverless-azure-functions/issues/232)) ([2157db1](https://github.com/serverless/serverless-azure-functions/commit/2157db1))


### Features

* APIM example doc ([#225](https://github.com/serverless/serverless-azure-functions/issues/225)) ([16424e6](https://github.com/serverless/serverless-azure-functions/commit/16424e6))
* Cache interactive login credentials ([#222](https://github.com/serverless/serverless-azure-functions/issues/222)) ([1da74af](https://github.com/serverless/serverless-azure-functions/commit/1da74af))
* Handle SIGINT and cleanup offline files unless specified to skip ([#233](https://github.com/serverless/serverless-azure-functions/issues/233)) ([3618646](https://github.com/serverless/serverless-azure-functions/commit/3618646))



# [1.0.0-10](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-9...v1.0.0-10) (2019-08-07)


### Bug Fixes

* Add retry support when listing deployed functions ([#215](https://github.com/serverless/serverless-azure-functions/issues/215)) ([15ca299](https://github.com/serverless/serverless-azure-functions/commit/15ca299))
* Inject current environment variables to spawn process ([#218](https://github.com/serverless/serverless-azure-functions/issues/218)) ([eda7b64](https://github.com/serverless/serverless-azure-functions/commit/eda7b64))


### Features

* Added Azure Naming Service ([#221](https://github.com/serverless/serverless-azure-functions/issues/221)) ([b0c5ef7](https://github.com/serverless/serverless-azure-functions/commit/b0c5ef7)), closes [AB#597](https://github.com/AB/issues/597)
* Azure Pipelines CI pipeline & script ([#223](https://github.com/serverless/serverless-azure-functions/issues/223)) ([b9bac62](https://github.com/serverless/serverless-azure-functions/commit/b9bac62)), closes [AB#588](https://github.com/AB/issues/588)



# [1.0.0-9](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-8...v1.0.0-9) (2019-07-25)


### Features

* Spawn offline process with `sls offline` command ([#214](https://github.com/serverless/serverless-azure-functions/issues/214)) ([77553ae](https://github.com/serverless/serverless-azure-functions/commit/77553ae))



# [1.0.0-8](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-7...v1.0.0-8) (2019-07-24)


### Features

* Path from x-azure-settings is included in function.json ([#212](https://github.com/serverless/serverless-azure-functions/issues/212)) ([dcb7c9f](https://github.com/serverless/serverless-azure-functions/commit/dcb7c9f)), closes [AB#552](https://github.com/AB/issues/552)
* specify subscription ID in serverless yaml ([c5f8497](https://github.com/serverless/serverless-azure-functions/commit/c5f8497))



# [1.0.0-7](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-6...v1.0.0-7) (2019-07-22)


### Bug Fixes

* api uses shortened region names ([#211](https://github.com/serverless/serverless-azure-functions/issues/211)) ([9f69f24](https://github.com/serverless/serverless-azure-functions/commit/9f69f24))


### Features

* Added feature to specify Azure subcription ID in CLI before deployment ([#203](https://github.com/serverless/serverless-azure-functions/issues/203)) ([7ceb484](https://github.com/serverless/serverless-azure-functions/commit/7ceb484))
* Added npm script to generate service principal ([#196](https://github.com/serverless/serverless-azure-functions/issues/196)) ([a322f48](https://github.com/serverless/serverless-azure-functions/commit/a322f48))
* Deploy pre-existing package with `-p` CLI option ([#205](https://github.com/serverless/serverless-azure-functions/issues/205)) ([2b97f75](https://github.com/serverless/serverless-azure-functions/commit/2b97f75)), closes [AB#500](https://github.com/AB/issues/500)
* List deployments for rollback when no timestamp given ([#208](https://github.com/serverless/serverless-azure-functions/issues/208)) ([9b7bb74](https://github.com/serverless/serverless-azure-functions/commit/9b7bb74)), closes [AB#493](https://github.com/AB/issues/493)



# [1.0.0-6](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-5...v1.0.0-6) (2019-07-12)


### Bug Fixes

* Add sequence diagram png files ([#184](https://github.com/serverless/serverless-azure-functions/issues/184)) ([e183ae4](https://github.com/serverless/serverless-azure-functions/commit/e183ae4))
* Exit process when error logging into Azure ([#192](https://github.com/serverless/serverless-azure-functions/issues/192)) ([11c80b3](https://github.com/serverless/serverless-azure-functions/commit/11c80b3))
* Remove await statement from Promise.all ([#194](https://github.com/serverless/serverless-azure-functions/issues/194)) ([c51a865](https://github.com/serverless/serverless-azure-functions/commit/c51a865))
* Update storage account naming convention ([#190](https://github.com/serverless/serverless-azure-functions/issues/190)) ([74fdbe6](https://github.com/serverless/serverless-azure-functions/commit/74fdbe6)), closes [AB#420](https://github.com/AB/issues/420)


### Features

* Add options to base plugin class ([#198](https://github.com/serverless/serverless-azure-functions/issues/198)) ([d8cca60](https://github.com/serverless/serverless-azure-functions/commit/d8cca60))
* add support for specifying resourceGroup in both cli and yaml ([#189](https://github.com/serverless/serverless-azure-functions/issues/189)) ([691a4af](https://github.com/serverless/serverless-azure-functions/commit/691a4af))
* Rollback Plugin ([#191](https://github.com/serverless/serverless-azure-functions/issues/191)) ([cb1f295](https://github.com/serverless/serverless-azure-functions/commit/cb1f295)), closes [AB#317](https://github.com/AB/issues/317)
* Updates to deployment process to enable rollback (Part 2) ([#185](https://github.com/serverless/serverless-azure-functions/issues/185)) ([659282e](https://github.com/serverless/serverless-azure-functions/commit/659282e)), closes [AB#388](https://github.com/AB/issues/388) [AB#358](https://github.com/AB/issues/358) [AB#414](https://github.com/AB/issues/414) [AB#415](https://github.com/AB/issues/415)



# [1.0.0-5](https://github.com/serverless/serverless-azure-functions/compare/v1.0.0-4...v1.0.0-5) (2019-06-27)


### Bug Fixes

* Ensures the correct SCM domain is found for uploading zip package ([#178](https://github.com/serverless/serverless-azure-functions/issues/178)) ([d8cdbcf](https://github.com/serverless/serverless-azure-functions/commit/d8cdbcf))
* Fix misnamed variable in test ([#179](https://github.com/serverless/serverless-azure-functions/issues/179)) ([83cf9e4](https://github.com/serverless/serverless-azure-functions/commit/83cf9e4))


### Features

* Azure Blob Storage service ([#177](https://github.com/serverless/serverless-azure-functions/issues/177)) ([31cfbb8](https://github.com/serverless/serverless-azure-functions/commit/31cfbb8)), closes [AB#361](https://github.com/AB/issues/361)
* Azure region & stage defaults ([#172](https://github.com/serverless/serverless-azure-functions/issues/172)) ([f5c206a](https://github.com/serverless/serverless-azure-functions/commit/f5c206a))
* Dynamically generate ARM templates ([#174](https://github.com/serverless/serverless-azure-functions/issues/174)) ([09d7d05](https://github.com/serverless/serverless-azure-functions/commit/09d7d05))
* List deployments sub-command for deploy plugin ([#176](https://github.com/serverless/serverless-azure-functions/issues/176)) ([34db630](https://github.com/serverless/serverless-azure-functions/commit/34db630)), closes [AB#352](https://github.com/AB/issues/352)



# [1.0.0-4](https://github.com/serverless/serverless-azure-functions/compare/v0.7.0...v1.0.0-4) (2019-06-19)


### Bug Fixes

* Added access modifiers to shared services ([9dd8144](https://github.com/serverless/serverless-azure-functions/commit/9dd8144))
* Resolves issues running plugin  ([#141](https://github.com/serverless/serverless-azure-functions/issues/141)) ([e839a84](https://github.com/serverless/serverless-azure-functions/commit/e839a84))


### Features

* Adds webpack support for azure plugin ([#164](https://github.com/serverless/serverless-azure-functions/issues/164)) ([0b5b5ad](https://github.com/serverless/serverless-azure-functions/commit/0b5b5ad))
* Azure API management ([#157](https://github.com/serverless/serverless-azure-functions/issues/157)) ([2364a84](https://github.com/serverless/serverless-azure-functions/commit/2364a84))
* Azure Functions Offline plugin ([#159](https://github.com/serverless/serverless-azure-functions/issues/159)) ([91d55c6](https://github.com/serverless/serverless-azure-functions/commit/91d55c6)), closes [AB#257](https://github.com/AB/issues/257)
* Azure Packaging updates ([#163](https://github.com/serverless/serverless-azure-functions/issues/163)) ([4940069](https://github.com/serverless/serverless-azure-functions/commit/4940069)), closes [ABA#82](https://github.com/ABA/issues/82)
* Converted project to typescript ([#139](https://github.com/serverless/serverless-azure-functions/issues/139)) ([0c3e10d](https://github.com/serverless/serverless-azure-functions/commit/0c3e10d)), closes [AB#18671](https://github.com/AB/issues/18671)
* Deploy APIM CORS Policy ([#166](https://github.com/serverless/serverless-azure-functions/issues/166)) ([8bdd805](https://github.com/serverless/serverless-azure-functions/commit/8bdd805)), closes [ABA#207](https://github.com/ABA/issues/207)
* Enabled jest configuration to work in VS code ([#146](https://github.com/serverless/serverless-azure-functions/issues/146)) ([40fbf36](https://github.com/serverless/serverless-azure-functions/commit/40fbf36))
* Func plugin to add/remove functions within function app ([#151](https://github.com/serverless/serverless-azure-functions/issues/151)) ([3639b0f](https://github.com/serverless/serverless-azure-functions/commit/3639b0f))
* Mock of Serverless object for unit tests ([#144](https://github.com/serverless/serverless-azure-functions/issues/144)) ([0f89cb6](https://github.com/serverless/serverless-azure-functions/commit/0f89cb6)), closes [AB#18712](https://github.com/AB/issues/18712)



# [0.7.0](https://github.com/serverless/serverless-azure-functions/compare/v0.6.0...v0.7.0) (2018-10-18)



# [0.6.0](https://github.com/serverless/serverless-azure-functions/compare/v0.5.0...v0.6.0) (2018-04-26)



# [0.5.0](https://github.com/serverless/serverless-azure-functions/compare/v0.4.0...v0.5.0) (2018-03-14)



# [0.4.0](https://github.com/serverless/serverless-azure-functions/compare/v0.3.0...v0.4.0) (2017-07-30)



# [0.3.0](https://github.com/serverless/serverless-azure-functions/compare/v0.2.0...v0.3.0) (2017-07-20)



# [0.2.0](https://github.com/serverless/serverless-azure-functions/compare/0.1.3...v0.2.0) (2017-06-01)



## [0.1.3](https://github.com/serverless/serverless-azure-functions/compare/0.1.2...0.1.3) (2017-05-03)



