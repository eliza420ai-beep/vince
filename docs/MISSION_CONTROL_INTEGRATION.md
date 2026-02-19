# Mission Control Integration - WHY & How

*Generated: 2026-02-19*

---

## WHY This Integration Matters

### The Problem
You've spent **$3,000+ in AI tokens** building VINCE to MVP. Currently:
- 10 agents operating with limited orchestration
- Manual task tracking
- No governance/approval flows
- No unified dashboard for agent management

### The Solution
**Mission Control** gives you:

| Feature | Benefit |
|---------|---------|
| **Work Orchestration** | Boards, tasks, dependencies - all in one place |
| **Agent Lifecycle** | Register, monitor, pause, retire agents |
| **Governance** | Approval flows before sensitive actions |
| **Audit Trail** | Every action logged, searchable |
| **API-First** | Programmatic control, automation |
| **Dashboard** | Visual UI for everything |

### Why Satoshi (Me) Needs This
1. **Task Assignment** - You assign research tasks via Mission Control board
2. **Heartbeat Monitoring** - MC knows if I'm alive or stuck
3. **Result Capture** - My outputs get stored in MC, not lost
4. **Governance** - Sensitive actions can require approval
5. **Audit** - Every research task I complete is logged

### The Vision
```
You (Mission Control UI)
    │
    ├──► Assign Task: "Research NVDA"
    │         │
    │         ▼
    │    Task Board (Satoshi Research)
    │         │
    │         ▼
    │    OpenClaw Gateway ──► Satoshi Agent (Me)
    │         │
    │         ▼
    │    Complete Task + Store Result
    │         │
    │         ▼
    └──── Audit Log + Dashboard
```

---

## What We've Done

### ✅ Completed

1. **Mission Control Running**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000
   - Auth: Token configured

2. **Integration Code Built**
   - `missionControl.service.ts` - Full API client
   - `missionControl.actions.ts` - Task management actions
   - Registered in plugin-solus

3. **API Explored**
   - Agents CRUD
   - Boards CRUD
   - Tasks CRUD
   - Gateways management

---

## Current Status

### What's Working
- Mission Control UI loads
- API authentication works
- Service + actions registered in VINCE

### What's Blocked
- **Gateway Connection** - Need to connect OpenClaw Gateway to Mission Control
  - Gateway must be reachable (WebSocket)
  - Board creation requires gateway_id
  - Agent dispatch requires active gateway

---

## Integration Code

### Service: MissionControlService
```typescript
// Key methods:
- registerSatoshi()     // One-click register me
- createSatoshiBoard()  // Create research board
- createTask()          // Assign tasks
- listTasks()           // See pending work
```

### Actions
| Action | Trigger | Does |
|--------|---------|------|
| `MC_REGISTER_SATOSHI` | "Register in Mission Control" | Creates agent + board |
| `MC_ASSIGN_TASK` | "Research NVDA" | Creates task |
| `MC_LIST_TASKS` | "Show tasks" | Lists all tasks |

---

## How to Use

### 1. Set Environment
```bash
MISSION_CONTROL_TOKEN=UZa5vElWgALYR7DU0F65t0PdKJ5J8Mcv0V4RFCVh8JRvMKrnRliyI9gLfRcc4l/ntu8=
MISSION_CONTROL_URL=http://localhost:8000/api/v1
```

### 2. Connect Gateway (Prerequisite)
```bash
# Find your gateway WebSocket URL
openclaw gateway --help | grep ws

# Register in Mission Control UI or API
POST /gateways {
  "name": "OpenClaw",
  "url": "ws://localhost:PORT",
  "workspace_root": "/path/to/workspace",
  "token": "your-token"
}
```

### 3. Restart VINCE
```bash
# To pick up new service
```

### 4. Register Satoshi
Say: "Register Satoshi in Mission Control"

### 5. Assign Tasks
Say: "Research TSLA" → Creates task in MC board

---

## What's Next

### Priority 1: Connect Gateway
Need to:
1. Find OpenClaw Gateway WebSocket URL
2. Register gateway in Mission Control
3. Create Satoshi Research board

### Priority 2: Task Flow
1. Create task in MC board
2. Gateway dispatches to Satoshi
3. Satoshi completes task
4. Result stored in MC

### Priority 3: Governance
1. Set up approval flows for sensitive tasks
2. Configure audit logging
3. Define escalation rules

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Mission Control (Docker)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │  Frontend  │  │   Backend   │  │  PostgreSQL  │  │
│  │  :3000     │◄─┤   :8000     │◄─┤              │  │
│  └─────────────┘  └──────┬──────┘  └──────────────┘  │
└──────────────────────────┼──────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ OpenClaw    │
                    │  Gateway    │
                    │ (ws://..)   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Satoshi   │
                    │   Agent    │
                    └─────────────┘
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/plugins/plugin-solus/src/services/missionControl.service.ts` | API client |
| `src/plugins/plugin-solus/src/actions/missionControl.actions.ts` | Task actions |
| `openclaw-mission-control/` | MC repo (cloned locally) |

---

## Lessons Learned

1. **Gateway Required** - Can't create boards without registered gateway
2. **WebSocket** - Gateway URL must be `ws://` or `wss://`
3. **Auth Works** - Token authentication functional
4. **Schema Strict** - Need `slug` for boards, `gateway_id` for creation

---

## Open Questions (Answered)

| Question | Answer |
|----------|--------|
| Gateway Auth? | Token in body, WebSocket URL |
| Task Dispatch? | Via Gateway RPC |
| Agent Callbacks? | Via Gateway session messages |
| Webhooks? | Board webhooks supported |

---

*Last updated: 2026-02-19*
