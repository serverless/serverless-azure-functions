import Serverless from 'serverless';
import { AzureApimServicePlugin } from './apimServicePlugin';

describe('APIM Service Plugin', () => {
  it('is defined', () => {
    expect(AzureApimServicePlugin).toBeDefined();
  });

  it('can be instantiated', () => {
    const serverless = new Serverless();
    const options: Serverless.Options = {
      stage: '',
      region: '',
    }
    const plugin = new AzureApimServicePlugin(serverless, options);

    expect(plugin).not.toBeNull();
  });
});