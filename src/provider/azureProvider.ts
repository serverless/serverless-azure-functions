import Serverless from "serverless";
import config from "../config";

export default class AzureProvider {
  private serverless: any;

  public static getProviderName() {
    return config.providerName;
  }

  public constructor(serverless: Serverless) {
    this.serverless = serverless;
    this.serverless.setProvider(config.providerName, this);
  }
}
