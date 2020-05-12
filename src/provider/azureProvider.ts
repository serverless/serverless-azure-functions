import Serverless from "serverless";
import { constants } from "../shared/constants";

export default class AzureProvider {
  private serverless: any;

  public static getProviderName() {
    return constants.providerName;
  }

  public constructor(serverless: Serverless) {
    this.serverless = serverless;
    this.serverless.setProvider(constants.providerName, this);
  }
}
