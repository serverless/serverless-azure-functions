import { FunctionAppResource } from "./resources/functionApp";
import { AppInsightsResource } from "./resources/appInsights";
import { StorageAccountResource } from "./resources/storageAccount";
import { AppServicePlanResource } from "./resources/appServicePlan";
import { HostingEnvironmentResource } from "./resources/hostingEnvironment";
import { VirtualNetworkResource } from "./resources/virtualNetwork";
import { CompositeArmTemplate } from "./compositeArmTemplate";
import { ArmResourceTemplate } from "../models/armTemplates";
import { ServerlessAzureConfig } from "../models/serverless";

class AppServiceEnvironmentTemplate extends CompositeArmTemplate {
  public constructor() {
    super([
      new FunctionAppResource(),
      new AppInsightsResource(),
      new StorageAccountResource(),
      new AppServicePlanResource(),
      new HostingEnvironmentResource(),
      new VirtualNetworkResource(),
    ])
  }

  public getTemplate(config: ServerlessAzureConfig): ArmResourceTemplate {
    const template = super.getTemplate(config);

    template.parameters.appServicePlanSkuName.defaultValue = "I1";
    template.parameters.appServicePlanSkuTier.defaultValue = "Isolated";

    // Update the app service plan to point to the hosting environment
    const appServicePlan: any = template.resources.find((resource: any) => resource.type === "Microsoft.Web/serverfarms");
    if (appServicePlan) {
      appServicePlan.dependsOn = [...(appServicePlan.dependsOn || []), "[resourceId('Microsoft.Web/hostingEnvironments', parameters('hostingEnvironmentName'))]"];
      appServicePlan.properties.hostingEnvironmentProfile = {
        ...appServicePlan.properties.hostingEnvironmentProfile,
        id: "[resourceId('Microsoft.Web/hostingEnvironments', parameters('hostingEnvironmentName'))]",
      }
    }

    // Update the functionApp resource to include the app service plan references
    const app: any = template.resources.find((resource: any) => resource.type === "Microsoft.Web/sites");
    if (app) {
      app.dependsOn = [...(app.dependsOn || []), "[concat('Microsoft.Web/serverfarms/', parameters('appServicePlanName'))]"];
      app.properties.serverFarmId = "[resourceId('Microsoft.Web/serverfarms', parameters('appServicePlanName'))]";
      app.properties.hostingEnvironmentProfile = {
        ...app.properties.hostingEnvironmentProfile,
        id: "[resourceId('Microsoft.Web/hostingEnvironments', parameters('hostingEnvironmentName'))]",
      }
    }

    return template;
  }
}

export default new AppServiceEnvironmentTemplate();