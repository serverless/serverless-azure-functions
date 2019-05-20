import { join } from 'path'

export default function uploadFunction () {
  const functionName = this.options.function;

  return this.provider.uploadFunction(functionName)
    .then(() => this.provider.runKuduCommand('mv '+ join(functionName, functionName +'-function.json') +' '+ join(functionName, 'function.json')))
    .then(() => this.provider.syncTriggers());
};