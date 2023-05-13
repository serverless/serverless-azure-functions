import run from "clvr";
import { defaultParameters } from "../parameters";

run({
  name: "Install Test",
  parameters: defaultParameters,
  validations: [
    {
      // relative path to package.json so that we run the rest of the tests using the updated package
      command: "npm i ../../../",
      silent: true,
    },
  ]
});
