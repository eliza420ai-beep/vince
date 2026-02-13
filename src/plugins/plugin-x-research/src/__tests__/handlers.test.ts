/**
 * Action Handler Tests
 *
 * Tests handler logic with mocked services.
 */

import { describe, it, expect, vi } from 'vitest';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { xSaveResearchAction } from '../actions/xSaveResearch.action';
import { xSearchAction } from '../actions/xSearch.action';
import { setLastResearch } from '../store/lastResearchStore';
import type { Memory, IAgentRuntime, HandlerCallback } from '@elizaos/core';

vi.mock('../services/xClient.service', () => ({
  initXClientFromEnv: vi.fn(),
}));

const mockRuntime = {} as IAgentRuntime;

function createMemory(text: string, roomId?: string): Memory {
  return {
    content: { text },
    userId: 'test-user',
    agentId: 'test-agent',
    roomId: roomId ?? 'test-room',
  } as Memory;
}

function createCallback(): HandlerCallback {
  return vi.fn();
}

describe('X_SAVE_RESEARCH handler', () => {
  it('calls callback with help when no roomId', async () => {
    const callback = createCallback();
    const memory = createMemory('save that');
    (memory as { roomId?: string }).roomId = undefined;

    await xSaveResearchAction.handler!(
      mockRuntime,
      memory,
      {},
      {},
      callback as HandlerCallback
    );

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Couldn't determine room"),
        action: 'X_SAVE_RESEARCH',
      })
    );
  });

  it('calls callback with help when no lastResearch', async () => {
    const callback = createCallback();

    await xSaveResearchAction.handler!(
      mockRuntime,
      createMemory('save that', 'room-with-no-pulse'),
      {},
      {},
      callback as HandlerCallback
    );

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Nothing to save'),
        action: 'X_SAVE_RESEARCH',
      })
    );
  });

  it('saves and calls callback with filepath when lastResearch exists', async () => {
    const roomId = 'room-save-test';
    const content = '📊 X Pulse\n\nBullish...';
    setLastResearch(roomId, content);
    const callback = createCallback();

    const testDir = join(tmpdir(), `x-research-handler-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    const origEnv = process.env.X_RESEARCH_SAVE_DIR;
    process.env.X_RESEARCH_SAVE_DIR = testDir;

    try {
      await xSaveResearchAction.handler!(
        mockRuntime,
        createMemory('save that', roomId),
        {},
        {},
        callback as HandlerCallback
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/Saved to .*research-\d{4}-\d{2}-\d{2}/),
          action: 'X_SAVE_RESEARCH',
        })
      );
      const match = (callback as ReturnType<typeof vi.fn>).mock.calls[0][0].text.match(/Saved to `(.+)`/);
      if (match) {
        const filepath = match[1];
        expect(existsSync(filepath)).toBe(true);
        expect(readFileSync(filepath, 'utf-8')).toBe(content);
      }
    } finally {
      if (origEnv !== undefined) process.env.X_RESEARCH_SAVE_DIR = origEnv;
      else delete process.env.X_RESEARCH_SAVE_DIR;
    }
  });
});

describe('X_SEARCH handler', () => {
  it('calls callback with help when query cannot be extracted', async () => {
    const callback = createCallback();
    // "what is btc" doesn't match any extractQuery pattern
    const memory = createMemory('what is btc');

    await xSearchAction.handler!(
      mockRuntime,
      memory,
      {},
      {},
      callback as HandlerCallback
    );

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('I need a search query'),
        action: 'X_SEARCH',
      })
    );
  });

});

describe('Plugin actions structure', () => {
  it('all actions have validate and handler defined', async () => {
    const { xResearchPlugin } = await import('../index');
    for (const action of xResearchPlugin.actions) {
      expect(action.validate).toBeDefined();
      expect(typeof action.validate).toBe('function');
      expect(action.handler).toBeDefined();
      expect(typeof action.handler).toBe('function');
    }
  });
});
