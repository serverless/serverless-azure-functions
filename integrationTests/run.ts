import { run, Summarizers } from "clvr"
import { getDirectories } from "./tests/utils";
import { offlineTest } from "./tests/offlineTest";
import { defaultParameters } from "./parameters/default";
import { deployTest } from "./tests/deployTest";

const configArg = process.argv[2];

const configurations = (configArg) 
  ? configArg.split(",").map((config) => `configurations/${config}`)
  : getDirectories("configurations");

run([
  {
    name: "Offline Test",
    validations: offlineTest,
    parameters: defaultParameters,
    directories: configurations,
  },
  {
    name: "Deploy Test",
    validations: deployTest,
    parameters: defaultParameters,
    directories: configurations,
  }
]);
