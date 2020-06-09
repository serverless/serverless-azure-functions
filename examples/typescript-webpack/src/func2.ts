import { AzureFunction } from "@azure/functions";

const handler: AzureFunction = async (context, req): Promise<void> => {
  console.log("context", JSON.stringify(context));
  console.log("req", JSON.stringify(req));

  context.res = {
    status: 200,
    body: "Hello func2"
  }
};

export default handler;
