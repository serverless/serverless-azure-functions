import Serverless from "serverless";
import { configConstants } from "../config/constants";

export default class AzureProvider {
  private serverless: any;

  public static getProviderName() {
    return configConstants.providerName;
  }

  public constructor(serverless: Serverless) {
    this.serverless = serverless;
    this.serverless.setProvider(configConstants.providerName, this);
  }
}
