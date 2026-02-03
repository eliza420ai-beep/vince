import { type Project } from '@elizaos/core';
import { vinceAgent } from './agents/vince.ts';
import { elizaAgent } from './agents/eliza.ts';
import logFilterPlugin from './plugins/plugin-log-filter/src/index.ts';

const project: Project = {
  agents: [
    {
      ...vinceAgent,
      plugins: [logFilterPlugin, ...(vinceAgent.plugins ?? [])],
    },
    {
      ...elizaAgent,
      plugins: [logFilterPlugin, ...(elizaAgent.plugins ?? [])],
    },
  ],
};

export { vinceAgent } from './agents/vince.ts';
export { elizaAgent } from './agents/eliza.ts';

export default project;
