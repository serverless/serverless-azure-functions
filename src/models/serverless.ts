export interface ServerlessYml {
  provider: {
    name: string;
    location: string;
  };
  plugins: string[];
  functions: any;
}
