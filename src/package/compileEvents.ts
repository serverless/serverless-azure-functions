import { getFunctionMetaData } from '../shared/utils'
import { Promise } from 'bluebird'

export default function compileEvents() {
  const createEventsPromises = [];

  this.serverless.service.getAllFunctions().forEach((functionName) => {
    const metaData = getFunctionMetaData(functionName, this.provider.getParsedBindings(), this.serverless);

    createEventsPromises.push(this.provider.createEventsBindings(functionName, metaData.entryPoint, metaData.handlerPath, metaData.params));
  });

  return Promise.all(createEventsPromises);
};