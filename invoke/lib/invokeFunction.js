'use strict';

module.exports = {
  invokeFunction() {
    this.provider.initialise(this.serverless, this.options);

    const func = this.options.function;
    const functionObject = this.serverless.service.getFunction(func);
    const eventType = Object.keys(functionObject.events[0])[0];

    return this.provider.invoke(func, eventType, this.options.data);
    // TODO: Github issue: https://github.com/Azure/azure-webjobs-sdk-script/issues/1122
    // .then(() => this.provider.getInvocationId(func))
    // .then(() => this.provider.getLogsForInvocationId());
  }
};
