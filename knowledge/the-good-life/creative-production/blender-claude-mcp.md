---
tags: [lifestyle]
agents: [kelly, eliza]
last_reviewed: 2026-02-17
---

# Integrating Claude Desktop App with Blender via MCP Server

Use this when they ask about connecting Claude to Blender. The MCP ecosystem evolves fast — always check current implementations via WEB_SEARCH.

---

## Why integrate Claude + Blender

- **Natural language → 3D operations.** "Add a cube, subdivide twice, apply a glass material" — Claude translates intent into bpy (Blender's Python API) calls via an MCP server.
- **Scene queries.** "What objects are in the scene?", "What's the render resolution?", "List all materials." Claude reads the scene and answers.
- **Batch automation.** Generate 20 variations of a model, render all camera angles, export in multiple formats — all from a conversation.
- **Creative exploration.** Describe a mood or concept; Claude suggests and executes a starting point in Blender. Iterate through conversation.
- **Learning tool.** Ask Claude to explain what each Blender operation does while it executes. Learn bpy by watching it work.

---

## Architecture

```
Claude Desktop App  ←→  MCP Server (local)  ←→  Blender (bpy)
     (user)              (bridge)              (3D engine)
```

**MCP server:** Runs locally on the same machine as Blender. Exposes tools (functions) that Claude can call. Each tool maps to one or more bpy operations.

**Blender side:** Either running headlessly (`blender --background --python server_script.py`) or with a listening script in a running GUI instance (socket, stdio, or HTTP bridge).

**Claude Desktop config:** Add the MCP server in Claude Desktop settings (command to start the server, or URL if it runs separately). Once configured, Claude sees the server's tools and can invoke them.

---

## Typical tool set

Start small. These cover 80% of use cases:

| Tool             | What it does                                                                |
| ---------------- | --------------------------------------------------------------------------- |
| `create_object`  | Add primitives (cube, sphere, cylinder, plane) with optional position/scale |
| `delete_object`  | Remove named object(s) from the scene                                       |
| `set_transform`  | Set location, rotation, scale on an object                                  |
| `get_scene_info` | List all objects, their types, transforms                                   |
| `apply_modifier` | Add/apply modifiers (subdivision, mirror, boolean, array)                   |
| `set_material`   | Create or assign a material with color/roughness/metallic                   |
| `render_frame`   | Render current view to image file                                           |
| `export_scene`   | Export to FBX, glTF, OBJ, USD                                               |
| `run_script`     | Execute arbitrary Python — the escape hatch for anything not covered        |

Add more tools as needed. Keep each tool focused and well-named.

---

## Setup steps (general — verify via WEB_SEARCH)

1. **Install Blender** (3.6+ or 4.x recommended for Python 3.10+ compatibility).
2. **Find or build an MCP server** for Blender:
   - Search: "Blender MCP server GitHub" — several open-source implementations exist.
   - Key repos to look for: `blender-mcp`, `mcp-blender-server`, or community forks.
   - The server should expose bpy operations as MCP tools.
3. **Configure Claude Desktop:**
   - Open Claude Desktop → Settings → MCP Servers.
   - Add the server: point to the command that starts it (e.g. `python blender_mcp_server.py`) or a URL.
   - Test: ask Claude "what MCP tools are available?" — it should list the Blender tools.
4. **Start Blender** (headless or GUI with the listener script running).
5. **Test:** Ask Claude to "create a red cube at the origin" — it should call the tool and report success.

**Important:** Implementations change. Always WEB_SEARCH for current setup guides and repos. Say when you looked it up.

---

## Best practices

- **Start read-only.** First tools should be queries (list objects, get scene info). Add write tools once the pipeline is stable.
- **Confirmation for destructive ops.** Delete all, overwrite project file, clear scene — these should require explicit user confirmation. Build this into the tool or instruct Claude.
- **Error handling.** Blender may be closed, busy rendering, or the scene may not have the requested object. The server should return clear error messages so Claude can explain what went wrong.
- **File management.** Save before major operations. Version your .blend files. Don't let automation overwrite the only copy.
- **Headless vs GUI:**
  - **Headless** (`blender --background`): Best for automation, batch rendering, CI pipelines. No visual feedback.
  - **GUI with listener:** Best for interactive use — you see changes in real-time while Claude drives. More fun, more useful for learning.

---

## Creative workflows

### Concept prototyping

"Build me a minimalist room: white walls, one window, a single chair, warm directional light." Claude creates the scene; you refine in Blender. Faster than starting from scratch.

### Procedural generation

"Create 10 variations of this object with random scale and rotation." Claude loops through `create_object` and `set_transform` with randomized parameters. Export all as a grid render.

### Architectural visualization

Describe a space; Claude builds the geometry. Apply materials and lighting through conversation. Render and iterate.

### Music visualization (Ableton + Blender)

MIDI or audio data from Ableton → drive Blender keyframes via the MCP server. Animate objects to the beat. This is bleeding-edge but the pieces exist — MCP for Blender + OSC/MIDI bridge from Ableton.

---

## What to search for (keep current)

- **"Blender MCP server 2026"** — latest implementations and repos.
- **"Claude Desktop MCP Blender setup"** — step-by-step guides.
- **"Blender Python API MCP tools"** — tool design patterns.
- **"MCP server template"** — if building a custom server from scratch.
- **Anthropic MCP documentation** — the official spec and SDK.

---

## Connection to the studio build

The 85 sqm studio (see home-and-spaces) will be the workspace for this. Blender on a capable machine, Capture One on another (or the same), Ableton for music — all connected through MCP servers. Claude as the creative co-pilot across tools. The vision: describe what you want across mediums, and the tools respond.
