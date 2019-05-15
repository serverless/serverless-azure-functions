import { deployFunction } from './deployOperation';

export const deployFunctions = (serverless) => {
  serverless.cli.log('Starting to deploy Operations');

  const deployApiTasks = serverless.service
    .getAllFunctions()
    .map((functionName) => {
      return deployFunction(serverless, { function: functionName });
    });

  return Promise.all(deployApiTasks);
};
