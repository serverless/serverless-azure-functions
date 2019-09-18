export interface FunctionBindingConfig {
  type?: string;
}

export interface FunctionHttpBindingConfig extends FunctionBindingConfig {
  authLevel: string;
  methods: string[];
  route: string;
  name: string;
  url: string;
}
