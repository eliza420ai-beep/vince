import { type Project } from '@elizaos/core';
import { vinceAgent } from './agents/vince.ts';
import logFilterPlugin from './plugins/plugin-log-filter/src/index.ts';

const project: Project = {
  agents: [
    {
      ...vinceAgent,
      plugins: [logFilterPlugin, ...(vinceAgent.plugins ?? [])],
    },
  ],
};

export { vinceAgent } from './agents/vince.ts';

export default project;
