export async function invokeHook(plugin: { hooks: { [eventName: string]: Promise<any> } }, hook: string) {
  return await (plugin.hooks[hook] as any)();
}

export function setEnvVariables(variables: any) {
  const keys = Object.keys(variables);
  for (const key of keys) {
    process.env[key] = variables[key];
  }
}

export function unsetEnvVariables(variables: any) {
  const keys = Object.keys(variables);
  for (const key of keys) {
    delete process.env[key];
  }
}

/**
 * Stringifies the JSON and substitutes values from params
 * @param json JSON object
 * @param params Parameters for substitution
 */
export function interpolateJson(json: any, params: any) {
  const template = JSON.stringify(json);
  const outputJson = interpolate(template, params);
  return JSON.parse(outputJson);
}

/**
 * Makes substitution of values in string
 * @param template String containing variables
 * @param params Params containing substitution values
 */
export function interpolate(template: string, params: any) {
  const names = Object.keys(params);
  const vals = Object["values"](params);
  return new Function(...names, `return \`${template}\`;`)(...vals);
}