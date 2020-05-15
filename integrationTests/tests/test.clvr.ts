import run from "clvr";
import { defaultParameters } from "../parameters";

run({
  name: "Clvr Test",
  parameters: defaultParameters,
  validations: [
    {
      command: "ls",
      files: {
        "serverless.yml": {
          shouldExist: true
        }
      }
    },
  ]
});
