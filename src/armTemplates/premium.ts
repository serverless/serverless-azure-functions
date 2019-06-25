import { FunctionAppResource } from "./resources/functionApp";
import { AppInsightsResource } from "./resources/appInsights";
import { StorageAccountResource } from "./resources/storageAccount";
import { AppServicePlanResource } from "./resources/appServicePlan";
import { ArmResourceTemplate } from "../models/armTemplates";
import { CompositeArmTemplate } from "./compositeArmTemplate";

class PremiumPlanTemplate extends CompositeArmTemplate {
  public constructor() {
    super([
      new FunctionAppResource(),
      new AppInsightsResource(),
      new StorageAccountResource(),
      new AppServicePlanResource(),
    ])
  }

  public getTemplate(): ArmResourceTemplate {
    const template = super.getTemplate();

    template.parameters.appServicePlanSkuName.defaultValue = "EP1";
    template.parameters.appServicePlanSkuTier.defaultValue = "ElasticPremium";

    // Update the functionApp resource to include the app service plan references
    const app: any = template.resources.find((resource: any) => resource.type === "Microsoft.Web/sites");
    if (app) {
      app.properties.serverFarmId = "[resourceId('Microsoft.Web/serverfarms', parameters('appServicePlanName'))]";
      app.dependsOn = [...(app.dependsOn || []), "[concat('Microsoft.Web/serverfarms/', parameters('appServicePlanName'))]"]
    }

    return template;
  }
}

export default new PremiumPlanTemplate();