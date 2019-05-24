import { OperationContract, ApiContract, BackendContract } from "@azure/arm-apimanagement/esm/models";

export interface ApiManagementConfig {
  name: string;
  api: ApiContract;
  backend: BackendContract;
}

export interface ApiOperationOptions {
  function: string;
  operation: OperationContract;
}