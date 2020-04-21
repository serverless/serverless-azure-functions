/**
 * Hooks that require authentication before execution
 */
export const loginHooks = [
  "deploy:list:list",
  "deploy:deploy",
  "deploy:apim:apim",
  "invoke:invoke",
  "rollback:rollback",
  "remove:remove",
  "info:info"
]
