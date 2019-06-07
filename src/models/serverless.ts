export interface ServerlessAzureConfig {
  provider: {
    name: string;
    location: string;
  };
  plugins: string[];
  functions: any;
}
