import { FunctionAppResource } from "./resources/functionApp";
import { AppInsightsResource } from "./resources/appInsights";
import { StorageAccountResource } from "./resources/storageAccount";
import { CompositeArmTemplate } from "./compositeArmTemplate";

class ConsumptionPlanTemplate extends CompositeArmTemplate {
  public constructor() {
    super([
      new FunctionAppResource(),
      new AppInsightsResource(),
      new StorageAccountResource(),
    ])
  }
}

export default new ConsumptionPlanTemplate();