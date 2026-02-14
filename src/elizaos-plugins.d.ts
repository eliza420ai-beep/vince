/**
 * Type declarations for ElizaOS plugins when TS cannot resolve their built-in types.
 */
declare module "@elizaos/plugin-sql" {
  const plugin: unknown;
  export default plugin;
}

declare module "@elizaos/plugin-bootstrap" {
  const plugin: unknown;
  export default plugin;
}

declare module "@elizaos/plugin-discovery" {
  const discoveryPlugin: unknown;
  export default discoveryPlugin;
  export { discoveryPlugin };
}

declare module "@elizaos/plugin-8004" {
  import type { Plugin } from "@elizaos/core";
  export const erc8004Plugin: Plugin;
  export default erc8004Plugin;
}
