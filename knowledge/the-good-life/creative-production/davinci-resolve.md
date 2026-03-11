---
tags: [lifestyle]
agents: [kelly, eliza]
last_reviewed: 2026-02-17
---

# DaVinci Resolve — Video Editing & Color Grading

The user's post-production tool for the BMPCC 6K. Hollywood's standard for color grading, also a full NLE, VFX compositor, and audio workstation in one app. Free version is remarkably capable; Studio adds AI features and higher-end tools.

---

## Why Resolve

- **Color grading:** The best in the industry. Node-based, 32-bit float, same tool used on feature films. This is the primary reason to use Resolve.
- **BRAW native:** Blackmagic RAW clips decode natively — no transcoding. Adjust raw settings (exposure, white balance, ISO) directly in Resolve.
- **All-in-one:** Edit, color, VFX (Fusion), audio (Fairlight), and deliver from a single app. No round-tripping.
- **Free:** The free version is a full professional tool. Studio (~$295 one-time) adds AI features, noise reduction, HDR tools, and higher resolution/frame rate support.

---

## The pages (workflow order)

### Media page

- Import, organize, and manage footage. Sync external audio to video (by timecode or waveform).
- Clone media for backup. Metadata management.

### Cut page (fast editing)

- Simplified interface for quick assembly. Dual timeline view.
- Source tape: scrub through all media in one view.
- Ideal for initial rough cut, social content, news.

### Edit page (full NLE)

- Traditional multi-track timeline. Advanced trimming (ripple, roll, slip, slide).
- Full effects, transitions, titles. Keyboard customizable.
- Where the final cut happens for narrative, documentary, long-form.

### Fusion page (VFX & motion graphics)

- Node-based compositing (like Nuke, not layer-based like After Effects).
- 2D/3D VFX, motion graphics, particle systems, keying, rotoscoping, camera tracking.
- Powerful but has a learning curve. Start simple — text overlays, basic compositing.

### Color page (the star)

- **Primary corrections:** Lift (shadows), Gamma (midtones), Gain (highlights) wheels + Offset. Temperature, tint, contrast, saturation, pivot.
- **Secondaries:** Qualifiers (select by color/hue/luma), Power Windows (shapes that isolate areas), tracking (follow subjects/objects).
- **Node system:** Non-destructive, infinitely flexible. Serial nodes (chain), parallel nodes (blend), layer nodes (composite), splitter/combiner (work on individual channels).
- **Curves:** Custom curves per channel (RGB, Hue vs Hue, Hue vs Sat, Luma vs Sat). Precise, targeted.
- **HDR grading:** Zone-based wheels, HDR scopes, ST.2084 and HLG support.
- **Color management:** ACES or DaVinci Wide Gamut for wide-gamut workflows. Color Space Transform node for converting between spaces.

### Fairlight page (audio)

- Full DAW built into Resolve. Up to 2000 tracks.
- Dialogue cleanup, ADR, Foley, mixing. Fairlight FX and third-party plugins.
- AI Voice Isolation (Studio): separate dialogue from background noise.
- Immersive audio: 5.1, 7.1, Dolby Atmos.

### Deliver page

- Export with presets or custom settings. Batch render multiple outputs.
- Direct upload to YouTube, Vimeo, TikTok.
- Common outputs: H.264/H.265 (web), ProRes (master/archive), DNxHR (broadcast).

---

## BMPCC 6K + BRAW workflow in Resolve

### Import and setup

1. Import BRAW clips into the Media page. They appear immediately — no transcode.
2. In the **Camera Raw** settings (left panel on Color page, or Media page): adjust **exposure, white balance, ISO, color space**. These are metadata changes on the raw — non-destructive, full quality.
3. Set project to the appropriate resolution (6K for master, scale down for delivery).
4. Timeline frame rate: 24fps (cinematic) or 25fps (PAL).

### Editing

- Rough cut on the Cut page; refine on the Edit page.
- Sync external audio by waveform (right-click → "Auto Sync Audio").
- Use proxies (Optimized Media) for smooth playback on slower machines. Reconform to BRAW for final grade.

### Color grading (the main event)

1. **Node structure:** Start with a serial node chain:
   - Node 1: **Balance** — neutral the image (white balance, exposure, contrast).
   - Node 2: **Look** — creative grade (color shifts, mood, style).
   - Node 3: **Secondaries** — targeted corrections (skin, sky, specific areas).
   - Node 4: **Output** — final trim, film grain, vignette (optional).

2. **Skin tones:** Use the qualifier to select skin, then adjust hue/saturation/luminance on a parallel or layer node. Blackmagic's color science starts with good skin — you're refining, not rescuing.

3. **Matching shots:** Use the Color Match tool or scopes (waveform, vectorscope, histogram) to match exposure and color across cuts. Consistency is key.

4. **BRAW advantage:** Since BRAW preserves full sensor data, you can change exposure ±5 stops, shift white balance, and adjust ISO — all in post, without quality loss. This is the superpower.

### Export

- **Master:** ProRes 422 HQ or ProRes 4444 (for archive/delivery to colorist or editor).
- **Web:** H.264 or H.265 at target bitrate. YouTube preset works well.
- **Broadcast:** DNxHR HQX.
- Apply output sharpening and LUT (if delivering with a baked look) in the Deliver page.

---

## IRIX lens considerations in Resolve

| Lens                | In Resolve                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| **15mm ultra-wide** | May need slight distortion correction. Use Resolve's lens correction or Fusion's Undistort node.            |
| **45mm T1.5**       | Clean, minimal correction needed. Wide-open shots have shallow DOF — grade for skin and subject separation. |
| **150mm T3.0**      | Telephoto compression looks great in Resolve — let the natural background blur speak. Minimal correction.   |

---

## DaVinci Resolve Studio (paid) additions

Worth the upgrade for:

- **DaVinci Neural Engine:** AI-powered face detection, object tracking, speed warp, magic mask, voice isolation.
- **Temporal + Spatial noise reduction:** Dramatically cleans up high-ISO footage. Night scenes, low-light BMPCC 6K footage.
- **HDR tools:** HDR grading wheels, zone-based adjustments, HDR scopes.
- **10-bit+ support:** H.265 10-bit encode, higher resolution, 120fps.
- **Multi-GPU:** Faster rendering on multi-GPU systems.
- **One-time purchase ($295):** No subscription. Lifetime updates. Insane value.

---

## Learning path

| Phase                   | Focus                                              | Time       |
| ----------------------- | -------------------------------------------------- | ---------- |
| **1. Cut + Edit**       | Import, assemble, basic cuts, transitions          | Week 1–2   |
| **2. Color basics**     | Lift/Gamma/Gain, primary corrections, scopes       | Week 3–4   |
| **3. BRAW workflow**    | Camera Raw settings, node structure, shot matching | Week 5–6   |
| **4. Secondaries**      | Qualifiers, Power Windows, tracking, skin tones    | Week 7–8   |
| **5. Fusion basics**    | Text, simple compositing, transitions              | Week 9–10  |
| **6. Fairlight**        | Audio mixing, dialogue cleanup, music              | Week 11–12 |
| **7. Advanced grading** | Node trees, HDR, film emulation, creative looks    | Ongoing    |

---

## When to use WEB_SEARCH

New Resolve versions (features change with each release), BRAW updates, specific LUTs or looks, tutorials for advanced techniques, or hardware acceleration tips — use WEB_SEARCH and say when you looked it up.
