import * as utils from '../../../shared/utils';

export function compileEvents(): Promise<any> {
  const createEventsPromises = [];

  this.serverless.service.getAllFunctions().forEach((functionName) => {
    const metaData = utils.getFunctionMetaData(functionName, this.provider.getParsedBindings(), this.serverless);

    createEventsPromises.push(this.provider.createEventsBindings(functionName, metaData.entryPoint, metaData.handlerPath, metaData.params));
  });

  return Promise.all(createEventsPromises);
}

