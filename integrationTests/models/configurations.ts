export interface Configurations {
  "node10-linux": any,
  "node10-linux-external": any,
  "node10-windows": any,
  "node10-windows-webpack": any,
  "node12-linux": any,
  "node12-linux-external": any,
  "node12-windows": any,
  "node12-windows-apim": any,
  "node12-windows-webpack": any,
  "python36": any,
  "python36-apim": any,
  "python37": any,
  "python38": any
}

export function getConfigurationsObject(): Configurations {
  return {
    "node10-linux": {},
    "node10-linux-external": {},
    "node10-windows": {},
    "node10-windows-webpack": {},
    "node12-linux": {},
    "node12-linux-external": {},
    "node12-windows": {},
    "node12-windows-apim": {},
    "node12-windows-webpack": {},
    "python36": {},
    "python36-apim": {},
    "python37": {},
    "python38": {}
  }
}
