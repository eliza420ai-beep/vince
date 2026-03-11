---
tags: [lifestyle]
agents: [kelly, eliza]
last_reviewed: 2026-02-17
---

# Ableton Push 3 — House Music Production

The user's setup for house music production: Ableton Live + Push 3. They want to dedicate time again and leverage AI/MCP.

---

## Push 3: What it is

Push 3 is both a standalone instrument and a controller for Ableton Live. It's the most complete hardware for making electronic music.

### Standalone mode

- Built-in processor (Intel Core i3, 8GB RAM, 256GB SSD). Runs Ableton Live internally.
- ~2.5 hours battery life. No laptop needed for rehearsal, sketching, or performance.
- Projects transfer seamlessly to/from Ableton Live on the computer.
- **Best for:** Sketching ideas away from the desk, performing live, traveling.

### Controller mode (connected to Live)

- Deep integration with every part of Ableton Live.
- Clip launching, arrangement, device control, mixing — all from the surface.
- Full plugin access (VSTs, AU) when running through the computer.
- **Best for:** Production sessions, AI/MCP integration (MCP server runs on the same machine), final arrangement.

---

## The instrument

### 64 pads (MPE-enabled)

- Velocity-sensitive, pressure-sensitive, per-pad pitch bend and slide.
- Polyphonic aftertouch — press harder on individual notes for expression.
- Play melodically (note mode), rhythmically (drum mode), or launch clips.

### Step sequencing

- Intuitive step editing for drums, melodies, and automation.
- Real-time recording or step-by-step programming.
- Per-step probability, velocity, and timing — micro-variations that make patterns feel alive.

### Sampling

- Built-in sampler: load audio, warp, slice, reshape.
- **Stem Separation** (Live 12.3+ Suite): isolate vocals, drums, bass, other from any audio. Slice and remap to pads.
- Sample from external sources (line in, microphone) directly on the device.

### Sound design

- Hands-on control of Live's instruments: Wavetable, Drift, Meld, Analog, Operator.
- Full-screen parameter visualization on the display.
- Real-time sound shaping — oscillators, filters, envelopes, modulation from the surface.

### Built-in audio interface

- Dual inputs (balanced), balanced outputs for monitors.
- CV/gate outputs for modular synthesizer integration.
- MIDI in/out for external hardware.
- Headphone out.

---

## House music on Push 3: the workflow

### Getting started (from zero to a track)

1. **Drums first.** Load a drum rack (Live's built-in 808/909 kits or a sample pack). Program a kick + hat + clap pattern on the pads. 4 bars. Keep it simple.
2. **Bass.** Switch to a bass instrument (Wavetable or Drift). Play a simple pattern — root notes, maybe a 2-note riff. Record live or step-sequence.
3. **Chords / pads.** Add a pad sound. Play 2–4 chords over 4 or 8 bars. This is the harmonic bed.
4. **Arrangement by clips.** Duplicate scenes, add/remove elements. Build an intro, breakdown, drop, outro. Session View on Push 3 makes this visual and tactile.
5. **Effects.** Add reverb, delay, filter sweeps. Automate with the encoders. This is where the track comes alive.

### House-specific tips

- **Tempo:** 120–128 BPM (classic house). 122 is the sweet spot for deep house.
- **Kick:** 4-on-the-floor. Sidechain the bass to the kick for that pump.
- **Hats:** Off-beat open hats are the signature of house. Velocity variation keeps it human.
- **Swing:** Add 50–60% swing to hats and percussion. Grooves → drag from Live's groove pool.
- **Sound sources:** Classic house = 808/909 drums, Juno/Moog-style pads, Rhodes keys, vocal chops. Wavetable and Drift in Live can get close to all of these.

---

## AI / MCP integration

### What MCP can do with Ableton

An MCP server running locally can control Ableton Live through OSC (Open Sound Control) or Max for Live:

- **Transport:** Start, stop, set tempo ("set tempo 124 BPM").
- **Clip control:** Launch clips, trigger scenes ("launch scene 3").
- **Device parameters:** Tweak filter cutoff, reverb wet/dry, any device param ("set reverb decay to 4 seconds").
- **Arrangement:** Create clips, set loop lengths, duplicate scenes.
- **Mixing:** Set track volume, pan, send levels.
- **Creative requests:** "Add a hi-hat pattern with swing", "Try a deeper bass sound" — Claude translates intent into Live operations.

### Architecture

```
Claude Desktop / MCP Client  ←→  MCP Server (local)  ←→  Ableton Live (OSC / Max for Live)
```

- **OSC:** Ableton Live responds to OSC messages. Many community tools map Live's API to OSC endpoints.
- **Max for Live:** Build custom devices that expose any Live parameter to external control. More flexible than OSC alone.
- **MCP server:** Translates natural language tool calls into OSC messages or Max for Live commands.

### Getting started with AI/MCP for music

1. Install a community OSC-to-Live bridge or Max for Live device.
2. Set up an MCP server that sends OSC to Live (search: "Ableton MCP server", "Ableton Live OSC control").
3. Configure Claude Desktop to use the MCP server.
4. Test: "Set tempo to 126 and launch scene 1."
5. Iterate: build more tools as your workflow demands.

**Implementations change.** Always WEB_SEARCH for current repos and guides. Say when you looked it up.

---

## Learning path

| Phase                  | Focus                                                    | Time                      |
| ---------------------- | -------------------------------------------------------- | ------------------------- |
| **1. Pads and clips**  | Play drums on pads, launch clips, record loops           | Week 1–2                  |
| **2. Step sequencing** | Program drum patterns, melodic sequences                 | Week 3–4                  |
| **3. Sound design**    | Shape synths (Wavetable, Drift), effects chains          | Week 5–8                  |
| **4. Arrangement**     | Build full tracks from Session View clips                | Week 9–12                 |
| **5. Sampling**        | Chop, warp, and resample; stem separation                | Ongoing                   |
| **6. Performance**     | Live sets, effect manipulation, transitions              | Ongoing                   |
| **7. AI/MCP**          | Integrate Claude, automate arrangement, generative ideas | When comfortable with 1–5 |

---

## Modular integration

Push 3 has **CV/gate outputs** — connect directly to Eurorack or desktop modular synths. Also MIDI in/out for external hardware (drum machines, synths, sequencers).

For house music: run an external analog synth (Moog, Korg) from Push 3's MIDI out, record the audio back in. Analog warmth + digital arrangement.

---

## Connection to the studio build

The 85 sqm studio (see home-and-spaces) is where this setup gets a permanent home: Push 3 on a stand, monitors on speaker pads, the Denon DJ setup nearby for mixing and DJ practice. Ableton for production, Engine DJ for mixing — two workflows, one space.
