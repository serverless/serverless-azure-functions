export interface FunctionApp {
  id: string;
  name: string;
  defaultHostName: string;
}

export interface FunctionAppHttpTriggerConfig {
  authLevel: string;
  methods: string[];
  route: string;
  name: string;
  url: string;
}
