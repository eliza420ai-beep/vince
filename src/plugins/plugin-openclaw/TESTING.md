# Testing plugin-openclaw

## How to run tests

From the **repository root**:

```bash
# Run only plugin-openclaw tests
bun test src/plugins/plugin-openclaw

# Or use the dedicated script
bun run test:openclaw
```

Tests use **Bun's test runner** (`bun:test`) and respect the repo `tsconfig.json` path alias `@/*` → `src/*`.

## Test files

| File                                             | Purpose                                                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/__tests__/test-utils.ts`                    | Shared mocks: `createMockMessage`, `createMockState`, `createMockRuntime`, `createMockCallback`, `withEnv`.                           |
| `src/__tests__/plugin.test.ts`                   | Plugin shape: name, description, 10 actions, 1 provider, no evaluators; exports for matcher and all actions.                          |
| `src/__tests__/matcher.test.ts`                  | `shouldOpenclawPluginBeInContext`: undefined state (fallback true), keywords, regex, no match.                                        |
| `src/__tests__/gatewayClient.service.test.ts`    | `isGatewayConfigured` (env); `getHealth` (remote blocked, loopback + mock fetch); `getStatus`; `runAgent` (mock exec).                |
| `src/__tests__/actions.test.ts`                  | All 10 actions: validate Clawterm bypass, trigger phrases, negative; handler callback, return value, key content substrings.          |
| `src/__tests__/openclawContext.provider.test.ts` | Provider `get()`: empty when no keywords; context when openclaw/gateway/ai 2027/research agent; `openclawGatewayConfigured` from env. |
| `src/__tests__/content-quality.test.ts`          | Substring checks for setup, security, AI 2027, HIP-3, agents guide, workspace sync; canonical URLs (releases, clawindex, steipete).   |
| `src/__tests__/clawterm-openclaw.test.ts`        | Clawterm agent includes plugin; system prompt lists all action names; messageExamples cover every OpenClaw action.                    |

## Adding tests for new actions

1. Add the action to the plugin in `src/index.ts`.
2. In `plugin.test.ts`, add the action name to `EXPECTED_ACTION_NAMES`.
3. In `actions.test.ts`, add an entry to `TRIGGERS`, `CONTENT_SUBSTRINGS`, and `ALL_ACTIONS`; the shared loop will generate validate/handler tests.
4. If the action returns guide-style content, add substring assertions in `content-quality.test.ts`.
5. In the Clawterm character, add a `messageExample` where the assistant response uses this action (so `clawterm-openclaw.test.ts` coverage stays green).
