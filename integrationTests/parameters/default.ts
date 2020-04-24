import { ConfigurationParameters } from "../models/parameters";

export const defaultParameters: ConfigurationParameters = {
  "node10-linux": {
    serviceName: "nd10-lin",
    configName: "node10-linux",
    runtime: "node 10.",
  },
  "node10-linux-external": {
    serviceName: "nd10-lin-ext",
    configName: "node10-linux-external",
    runtime: "node 10.",
  },
  "node10-windows": {
    serviceName: "nd10-win",
    configName: "node10-windows",
    runtime: "node 10.",
  },
  "node10-windows-webpack": {
    serviceName: "nd10-win-web",
    configName: "node10-windows-webpack",
    runtime: "node 10.",
  },
  "node12-linux": {
    serviceName: "nd12-lin",
    configName: "node12-linux",
    runtime: "node 12.",
  },
  "node12-linux-external": {
    serviceName: "nd12-lin-ext",
    configName: "node12-linux-external",
    runtime: "node 12.",
  },
  "node12-windows": {
    serviceName: "nd12-win",
    configName: "node12-windows",
    runtime: "node 12.",
  },
  "node12-windows-apim": {
    serviceName: "nd12-win-apim",
    configName: "node12-windows-apim",
    runtime: "node 12.",
  },
  "node12-windows-webpack": {
    serviceName: "nd12-win-web",
    configName: "node12-windows-webpack",
    runtime: "node 12.",
  },
  "python36": {
    serviceName: "py36",
    configName: "python36",
    runtime: "python 3.6",
  },
  "python36-apim": {
    serviceName: "py36-apim",
    configName: "python36-apim",
    runtime: "python 3.6",
  },
  "python37": {
    serviceName: "py37",
    configName: "python37",
    runtime: "python 3.7",
  },
  "python38": {
    serviceName: "py38",
    configName: "python38",
    runtime: "python 3.8",
  }
}