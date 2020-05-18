import run from "clvr";
import { defaultParameters } from "../parameters";

run({
  name: "Remove Test",
  parameters: defaultParameters,
  validations: [
    {
      command: "sls remove --force",
      retries: 3,
      stdout: {
        shouldContain: [
          "Service successfully removed"
        ]
      }
    },
  ]
});
