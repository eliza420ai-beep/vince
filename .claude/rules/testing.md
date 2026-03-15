---
paths: ["**/*.test.ts", "**/__tests__/**"]
---

# Test File Conventions

## Structure

- Use `describe` blocks named after the unit under test (service class, action name, or function).
- Use `createMockRuntime()` and `createMockServices()` from the nearest `test-utils.ts` for runtime mocks.
- Mock every external service the unit depends on — never make real API calls in unit tests.
- E2E tests go in `*.e2e.test.ts` files and are the only tests that hit real APIs.

## Assertions

- Assert specific values, not truthiness. `expect(result.strength).toBe(70)` not `expect(result).toBeTruthy()`.
- When testing actions, assert both `validate` (returns boolean) and `handler` (calls callback with expected text).
- When testing services, assert the return shape matches the TypeScript interface.

## Mocking Pattern

- Services are retrieved via `runtime.getService("service-name")`. Mock them by injecting into the services map returned by `createMockServices()`.
- Each mock service method should return the minimal valid response shape. Include all required fields, omit optional ones.
- For async service methods, return resolved promises — not raw values.

## Naming

- Test files: `<unitName>.test.ts` (e.g., `vincePaperTrading.service.test.ts`).
- Describe blocks: match the class or action name exactly.
- Test names: start with "should" and describe the expected behaviour, not the implementation.

## What NOT to Do

- Do not import from `@elizaos/core` internals — only from the public API.
- Do not use `any` for mock return types — match the real interface.
- Do not skip tests with `.skip` without a comment explaining why.
- Do not assert on log output — assert on return values and side effects.
