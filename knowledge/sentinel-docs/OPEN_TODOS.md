# Open TODOs (in-code)

Tracked here for visibility; not all are scheduled. Prefer fixing in order of impact.

| File                                                                 | One-line                                                               |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/plugins/plugin-erc8004/src/types/index.ts`                      | Add identityRegistryAddress when deployed (testnet + mainnet)          |
| `src/plugins/plugin-bootstrap/src/services/otaku-message-service.ts` | Implement streaming by passing onStreamChunk to model calls            |
| `src/plugins/plugin-x-research/src/actions/xPulse.action.ts`         | Detect topic; fetch thread length                                      |
| `src/plugins/plugin-x-research/src/services/xThreads.service.ts`     | Detect topic from content                                              |
| `src/plugins/plugin-x-research/src/services/xSentiment.service.ts`   | Implement temporal tracking for trend                                  |
| `src/plugins/plugin-bankr-trading-engine/src/index.ts`               | Add more actions                                                       |
| `src/plugins/plugin-inter-agent/src/standup/standupData.service.ts`  | Wire getSentimentData to plugin-x-research when ECHO generates reports |
