'use strict';

module.exports.sayHello = async function(context, req) {
  context.log('JavaScript HTTP trigger function processed a request.');

  if (req.query.name || (req.body && req.body.name)) {
    context.res = {
      // status: 200, /* Defaults to 200 */
      body: [
        "Hello",
        req.query.name || req.body.name,
        process.env['FUNCTIONS_WORKER_RUNTIME'],
        process.version,
        `Environment variable: ${process.env['VARIABLE_FOO']}`
      ].join(" "),
    };
  } else {
    context.res = {
      status: 400,
      body: 'Please pass a name on the query string or in the request body',
    };
  }
};
