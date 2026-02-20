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

## How to Install & Connect

### Phase 1: Start Mission Control

```bash
cd /Users/vince/openclaw-mission-control
docker compose up -d --build
```

Access:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000
- **Health:** http://localhost:8000/healthz

### Phase 2: Configure OpenClaw Gateway

The Gateway must be running and reachable by Mission Control.

#### Option A: LAN Mode (Recommended for local)

```bash
# Stop current gateway
openclaw gateway stop

# Find your local IP
ipconfig getifaddr en0

# Start with LAN bind + token auth
openclaw gateway start --bind lan --auth token --token satoshi123
```

This will output a WebSocket URL like: `ws://192.168.1.x:PORT`

#### Option B: Tailscale (If you have Tailscale)

```bash
openclaw gateway start --bind tailnet --auth token --token satoshi123
```

#### Option C: Custom Port

```bash
openclaw gateway start --bind custom --custom-bind 0.0.0.0:9000 --auth token --token satoshi123
```

### Phase 3: Register Gateway in Mission Control

1. Open **http://localhost:3000**
2. Sign in with auth token (from .env file)
3. Go to **Gateways** → **Add Gateway**
4. Fill in:

| Field | Value |
|-------|-------|
| **Name** | OpenClaw Gateway |
| **URL** | `ws://YOUR_IP:PORT` (from Gateway startup) |
| **Workspace Root** | `/Users/vince/.openclaw/workspace` |
| **Token** | `satoshi123` (or whatever you set) |

5. Click **Save**

### Phase 4: Restart VINCE

```bash
# Set environment variables
export MISSION_CONTROL_TOKEN=
export MISSION_CONTROL_URL=http://localhost:8000/api/v1

# Restart VINCE
openclaw gateway restart
```

### Phase 5: Register Satoshi

Once Gateway is connected:

1. Go to **Agents** → **New Agent**
2. Fill in:

| Field | Value |
|-------|-------|
| **Name** | Satoshi |
| **Board** | (select Satoshi Research board) |
| **Status** | Active |
| **Identity Template** | You are Satoshi, an AI research agent... |
| **Soul Template** | Be direct, concise, helpful... |

Or just say: "Register Satoshi in Mission Control" (once VINCE is restarted)

---

## Troubleshooting

### "Connection refused" when registering gateway

- Gateway not running: `openclaw gateway start --bind lan ...`
- Wrong IP: Check `ipconfig getifaddr en0`
- Wrong port: Check Gateway output for port number

### "board_id is required" when creating agent

- Gateway not connected/verified
- Must create board AFTER gateway is registered
- Board requires `gateway_id`

### Auth token not working

- Check `.env` file in openclaw-mission-control
- Token: `get from .env file`

---

## ⚠️ Security Note

**Token was rotated on 2026-02-19** - The token in git history was exposed. Current tokens are in:
- Mission Control `.env` file
- `~/.openclaw/openclaw.json` for gateway

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
