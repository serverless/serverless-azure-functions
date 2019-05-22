
import { existsSync, renameSync, statSync } from 'fs';
import { join } from "path";
import * as Serverless from 'serverless';
import AzureProvider from '../../provider/azureProvider';
import { createEventsBindings } from '../../shared/bindings';
import { getFunctionMetaData } from '../../shared/utils';

export class AzurePackage {
  provider: AzureProvider
  public hooks: { [eventName: string]: Promise<any> };

  constructor(private serverless: Serverless, private options: Serverless.Options) {
    this.hooks = {
      'package:setupProviderConfiguration': this.setupProviderConfiguration.bind(this),
      'before:webpack:package:packageModules': this.webpackFunctionJson.bind(this)
    };
  }

  private async setupProviderConfiguration() {
    this.serverless.cli.log('Building Azure Events Hooks');

    const createEventsPromises = this.serverless.service.getAllFunctions()
      .map((functionName) => {
        const metaData = getFunctionMetaData(functionName, this.serverless);

        return createEventsBindings(this.serverless.config.servicePath, functionName, metaData);
      });

    return Promise.all(createEventsPromises);
  }

  private async webpackFunctionJson(): Promise<any> {
    if (existsSync('.webpack')) {
      const webpackJsonPromises = this.serverless.service.getAllFunctions()
        .map((functionName) => this.moveJsonFile(functionName));

      return Promise.all(webpackJsonPromises);
    }

    return Promise.resolve();
  }

  private async moveJsonFile(functionName): Promise<any> {
    const dirPath = join(this.serverless.config.servicePath, '.webpack', functionName);
    const jsonFileName = `${functionName}-function.json`;
    const jsonFileSrcPath = join(this.serverless.config.servicePath, jsonFileName);
    const jsonFileDestPath = join(dirPath, jsonFileName);

    return new Promise((resolve) => {
      if (existsSync(dirPath) && statSync(dirPath).isDirectory()) {
        if (existsSync(jsonFileSrcPath)) {
          this.serverless.cli.log(`Moving ${jsonFileName} to .webpack directory.`);
          renameSync(jsonFileSrcPath, jsonFileDestPath);
        }
        else {
          this.serverless.cli.log(`Warning: No generated ${functionName}-function.json file was found. It will not be included in the package.`);
        }
      }

      resolve();
    });
  }
}
