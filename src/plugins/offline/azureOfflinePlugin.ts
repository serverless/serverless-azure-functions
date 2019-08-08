import Serverless from "serverless";
import { OfflineService } from "../../services/offlineService";
import { AzureBasePlugin } from "../azureBasePlugin";

export class AzureOfflinePlugin extends AzureBasePlugin {
  public hooks: { [eventName: string]: Promise<any> };
  public commands: any;
  private offlineService: OfflineService;

  public constructor(serverless: Serverless, options: Serverless.Options) {
    super(serverless, options);
    this.offlineService = new OfflineService(this.serverless, this.options);

    this.hooks = {
      "before:offline:offline": this.azureOfflineBuild.bind(this),
      "offline:build:build": this.azureOfflineBuild.bind(this),
      "offline:offline": this.azureOfflineStart.bind(this),
      "offline:start:start": this.azureOfflineStart.bind(this),
      "offline:cleanup:cleanup": this.azureOfflineCleanup.bind(this),
    };

    this.commands = {
      offline: {
        usage: "Start Azure Function App offline",
        lifecycleEvents: [
          "offline",
        ],
        commands: {
          start: {
            usage: "Start Azure Function app - assumes offline build has already occurred",
            lifecycleEvents: [
              "start"
            ],
            options: {
              nocleanup: {
                usage: "Do not clean up offline files after finishing process",
                shortcut: "n",
              }
            }
          },
          build: {
            usage: "Build necessary files for running Azure Function App offline",
            lifecycleEvents: [
              "build",
            ]
          },
          cleanup: {
            usage: "Clean up files from offline development",
            lifecycleEvents: [
              "cleanup"
            ]
          }
        },
        options: {
          nocleanup: {
            usage: "Do not clean up offline files after finishing process",
            shortcut: "n",
          }
        }
      }
    }
  }

  private async azureOfflineBuild(){
    await this.offlineService.build();
  }

  private async azureOfflineStart(){
    await this.offlineService.start();
  }

  private async azureOfflineCleanup(){
    await this.offlineService.cleanup();
  }
}
