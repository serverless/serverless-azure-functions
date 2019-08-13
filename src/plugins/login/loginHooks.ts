/**
 * Hooks that require authentication before execution
 */
export const loginHooks = [
  "deploy:list:list",
  "deploy:deploy",
  "invoke:invoke",
  "rollback:rollback",
  "remove:remove",
]
