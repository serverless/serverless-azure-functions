import { getFunctionMetaData } from '../shared/utils'

export default function compileEventsForFunction() {
  const functionName = this.options.function;
  const metaData = getFunctionMetaData(functionName, this.provider.getParsedBindings(), this.serverless);

  return this.provider.createEventsBindings(functionName, metaData.entryPoint, metaData.handlerPath, metaData.params);
};
