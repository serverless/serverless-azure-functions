export async function invokeHook(plugin: { hooks: { [eventName: string]: Promise<any> }}, hook: string) {
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