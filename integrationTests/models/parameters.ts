import { Configurations } from "./configurations";
import { InterpolateParameters } from "clvr";

export interface DefaultParameters extends InterpolateParameters {
  serviceName: string;
  configName: string;
  runtime: string;
}

export interface ConfigurationParameters extends Configurations {
  [config: string]: DefaultParameters
}
