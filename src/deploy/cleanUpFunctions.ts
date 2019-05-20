export default function cleanUpFunctions () {
  return this.provider.isExistingFunctionApp()
    .then(() => this.provider.getDeployedFunctionsNames())
    .then(() => this.provider.cleanUpFunctionsBeforeDeploy(this.serverless.service.getAllFunctions()));
};