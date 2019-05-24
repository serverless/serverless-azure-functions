export async function invokeHook(plugin: { hooks: { [eventName: string]: Promise<any> }}, hook: string) {
  return await (plugin.hooks[hook] as any)();
}