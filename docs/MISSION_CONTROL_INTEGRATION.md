# Mission Control Integration - Exploration Notes

*Generated: 2026-02-19*

---

## Why This Matters

Yves has spent **$3,000+ in AI tokens** building VINCE to MVP level. Mission Control will give fine-grained control over AI agents (like Satoshi/me) with:
- Work orchestration (boards, tasks)
- Agent lifecycle management
- Approval flows for governance
- Gateway management
- Activity timeline & audit
- API-first operations

---

## What We Explored

### Repository: eliza420ai-beep/openclaw-mission-control

**Tech Stack:**
- Frontend: Next.js
- Backend: FastAPI (Python)
- Database: PostgreSQL (SQLModel)
- Deployment: Docker Compose

### Key API Endpoints

#### Agent Management (`/api/agents`)
```
POST   /agents          - Create agent
GET    /agents          - List agents
GET    /agents/stream   - SSE stream of agents
PATCH  /agents/{id}     - Update agent
DELETE /agents/{id}     - Delete agent
```

#### Agent Schema
```json
{
  "board_id": "UUID",
  "name": "Satoshi",
  "status": "provisioning | active | paused | retired",
  "heartbeat_config": {
    "interval_seconds": 30,
    "missing_tolerance": 120
  },
  "identity_profile": {
    "role": "researcher",
    "skill": "stocks"
  },
  "identity_template": "You are Satoshi, AI research agent...",
  "soul_template": "Be direct, concise, helpful..."
}
```

#### Gateway Session (`/api/gateways`)
```
GET  /gateways/status                    - Check connectivity
GET  /gateways/sessions                 - List sessions
GET  /gateways/sessions/{id}            - Get session
GET  /gateways/sessions/{id}/history    - Chat history
POST /gateways/sessions/{id}/message    - Send message
```

#### Tasks (`/api/boards/{board_id}/tasks`)
- Full CRUD for tasks
- Task dependencies
- Comments
- Custom fields

---

## Local Setup (In Progress)

### Files Created
- **Repo cloned to:** `/Users/vince/openclaw-mission-control`
- **.env configured** with auth token

### Auth Token Generated
```
UZa5vElWgALYR7DU0F65t0PdKJ5J8Mcv0V4RFCVh8JRvMKrnRliyI9gLfRcc4l/ntu8=
```

### Next Steps (When Docker Ready)
```bash
cd /Users/vince/openclaw-mission-control
docker compose up -d --build

# Then access:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:8000
# - Health: http://localhost:8000/healthz
```

---

## Integration Plan

### Phase 1: Setup
- [x] Clone repo
- [x] Configure .env
- [ ] Start Docker containers
- [ ] Verify health endpoints

### Phase 2: Connect Gateway
- [ ] Register OpenClaw Gateway in Mission Control
- [ ] Verify session connectivity
- [ ] Test WebSocket connection

### Phase 3: Register Satoshi Agent
- [ ] Create agent profile in Mission Control
- [ ] Configure identity/soul templates
- [ ] Set heartbeat config
- [ ] Link to board

### Phase 4: Task Flow
- [ ] Create research board
- [ ] Add sample tasks
- [ ] Test task → agent dispatch
- [ ] Verify result capture

### Phase 5: Governance
- [ ] Set up approval flows
- [ ] Configure audit logging
- [ ] Define escalation rules

---

## Related Repos

| Repo | Purpose |
|------|---------|
| eliza420ai-beep/vince | Main VINCE repo (10 agents) |
| eliza420ai-beep/openclaw-mission-control | This repo - orchestration dashboard |
| eliza420ai-beep/milady | ElizaOS project (Shaw) |

---

## Tech Stack Notes

### Mission Control Architecture
```
┌─────────────────────────────────────────────┐
│           Mission Control UI                │
│            (Next.js :3000)                  │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           Mission Control API               │
│           (FastAPI :8000)                  │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         PostgreSQL Database                 │
└─────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         OpenClaw Gateway                   │
│    (Your existing OpenClaw instance)       │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         Satoshi Agent (Me)                 │
└─────────────────────────────────────────────┘
```

---

## Open Questions

1. **Gateway Connection** - How does Mission Control authenticate with OpenClaw Gateway? (Token? API key?)
2. **Task Dispatch** - What's the payload format for dispatching to agents?
3. **Agent Capabilities** - Can agents call back to Mission Control APIs?
4. **Webhooks** - Are there webhooks for agent events?

---

*Last updated: 2026-02-19*
