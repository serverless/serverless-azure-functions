
import * as utils from '../../../shared/utils';

export function compileEventsForFunction(): Promise<any> {
  const functionName = this.options.function;
  const metaData = utils.getFunctionMetaData(functionName, this.provider.getParsedBindings(), this.serverless);

  return this.provider.createEventsBindings(functionName, metaData.entryPoint, metaData.handlerPath, metaData.params);
}

