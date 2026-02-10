/**
 * Multi-agent entity resolution: ensureMessageSendersInRoom is called so that
 * every message sender is in the room before formatMessages/formatPosts run,
 * avoiding "[CORE:UTILS] No entity found for message (entityId=...)".
 */
import { describe, it, expect, mock } from "bun:test";
import { ensureMessageSendersInRoom } from "../providers/recentMessages";
import type { IAgentRuntime, Memory, UUID } from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";

const ENTITY_OTHER_AGENT = "15299a0c-1f3b-05b7-bdc0-12d2185a2ade" as UUID;
const ROOM_ID = "4d69eb3b-4ef8-03d2-925e-c748ce74b72e" as UUID;
const USER_ENTITY = "751562e1-49fe-49a8-b3bf-00e7174d777c" as UUID;

function createMockMemory(overrides: Partial<Memory>): Memory {
  return {
    id: uuidv4() as UUID,
    entityId: uuidv4() as UUID,
    roomId: ROOM_ID,
    agentId: uuidv4() as UUID,
    content: { text: "test", source: "test" },
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("ensureMessageSendersInRoom (multi-agent entity resolution)", () => {
  it("calls ensureConnection and addParticipant for each unique message sender", async () => {
    const ensureConnection = mock(() => Promise.resolve());
    const addParticipant = mock(() => Promise.resolve(true));
    const getRoom = mock(() => Promise.resolve({ id: ROOM_ID, worldId: ROOM_ID }));
    const getEntityById = mock(() => Promise.resolve(null));

    const runtime = {
      getRoom: getRoom,
      getEntityById: getEntityById,
      ensureConnection: ensureConnection,
      addParticipant: addParticipant,
    } as unknown as IAgentRuntime;

    const messages: Memory[] = [
      createMockMemory({ entityId: USER_ENTITY, content: { text: "What about Bitcoin?" } }),
      createMockMemory({ entityId: ENTITY_OTHER_AGENT, content: { text: "Kelly reply" } }),
      createMockMemory({ entityId: ENTITY_OTHER_AGENT, content: { text: "Another from same agent" } }),
    ];

    await ensureMessageSendersInRoom(runtime, ROOM_ID, messages);

    expect(getRoom).toHaveBeenCalledWith(ROOM_ID);
    expect(ensureConnection).toHaveBeenCalledTimes(2);
    expect(addParticipant).toHaveBeenCalledTimes(2);
    expect(ensureConnection).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: USER_ENTITY, roomId: ROOM_ID })
    );
    expect(ensureConnection).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: ENTITY_OTHER_AGENT, roomId: ROOM_ID })
    );
    expect(addParticipant).toHaveBeenCalledWith(USER_ENTITY, ROOM_ID);
    expect(addParticipant).toHaveBeenCalledWith(ENTITY_OTHER_AGENT, ROOM_ID);
  });

  it("skips when runtime has no ensureConnection", async () => {
    const addParticipant = mock(() => Promise.resolve(true));
    const runtime = {
      getRoom: () => Promise.resolve({ id: ROOM_ID, worldId: ROOM_ID }),
      getEntityById: () => Promise.resolve(null),
      addParticipant: addParticipant,
    } as unknown as IAgentRuntime;

    const messages = [createMockMemory({ entityId: ENTITY_OTHER_AGENT })];

    await ensureMessageSendersInRoom(runtime, ROOM_ID, messages);

    expect(addParticipant).not.toHaveBeenCalled();
  });

  it("does nothing when messages array is empty", async () => {
    const ensureConnection = mock(() => Promise.resolve());
    const runtime = {
      getRoom: () => Promise.resolve({ id: ROOM_ID, worldId: ROOM_ID }),
      ensureConnection: ensureConnection,
      addParticipant: () => Promise.resolve(true),
    } as unknown as IAgentRuntime;

    await ensureMessageSendersInRoom(runtime, ROOM_ID, []);

    expect(ensureConnection).not.toHaveBeenCalled();
  });
});
