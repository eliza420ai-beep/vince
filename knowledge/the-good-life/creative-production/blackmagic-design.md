---
tags: [lifestyle]
agents: [kelly, eliza]
last_reviewed: 2026-02-17
---

# Blackmagic Design — Cinema Camera & Ecosystem

The user's cinema camera: **BMPCC 6K** (Blackmagic Pocket Cinema Camera 6K) with **IRIX lenses**. Edited and graded in **DaVinci Resolve**. This file covers the camera, lenses, and the Blackmagic ecosystem.

---

## The user's setup

### BMPCC 6K (Blackmagic Cinema Camera 6K)

- **Sensor:** Super 35 (APS-C equivalent). 6144 × 3456 resolution.
- **Dynamic range:** 13 stops. Excellent for grading — pulls detail from shadows and highlights.
- **Recording format:** Blackmagic RAW (BRAW) — visually lossless, efficient file sizes, decodes natively in Resolve. Also ProRes.
- **Mount:** EF mount (Canon EF lenses, IRIX EF, adapted lenses). Some models also L-mount.
- **Build:** Compact cinema camera. Lightweight enough for run-and-gun; serious enough for narrative.
- **Screen:** 5" tilting touchscreen. Good for handheld; pair with external monitor for critical focus.
- **Why this camera:** Hollywood color science at an accessible price. BRAW + Resolve is one of the cleanest raw-to-delivery pipelines in filmmaking.

### IRIX lens set

Three primes that cover wide, standard, and telephoto:

| Lens                | Focal length    | Aperture | Use                                                                       |
| ------------------- | --------------- | -------- | ------------------------------------------------------------------------- |
| **IRIX 15mm**       | Ultra-wide      | f/2.4    | Architecture, landscapes, tight interiors, dramatic wide shots. Deep DOF. |
| **IRIX 45mm T1.5**  | Standard (fast) | T1.5     | Shallow DOF, low light, portraits, general narrative. The workhorse.      |
| **IRIX 150mm T3.0** | Telephoto       | T3.0     | Compression, reach, interviews, detail shots, shallow DOF at distance.    |

**Tip:** The 45mm at T1.5 on the Super 35 sensor gives beautiful separation. The 15mm is dramatic — use it for establishing shots and architecture. The 150mm compresses backgrounds and isolates subjects — great for interviews and detail.

---

## Shooting with the BMPCC 6K

### Settings for best results

- **Shoot BRAW** (not ProRes) for maximum grading latitude. BRAW 5:1 or 8:1 compression is the sweet spot — high quality, manageable file sizes.
- **ISO:** Dual native ISO (400 and 3200 on most models). Use 400 for daylight, 3200 for low light. Avoid high ISOs beyond the native points.
- **White balance:** Set manually or use Kelvin. Easy to adjust in Resolve since BRAW preserves the raw data.
- **Frame rate:** 24fps for cinematic; 25fps for PAL regions (Europe). Higher (60/120fps) for slow motion — crop applies at high frame rates.
- **Shoot flat (Film mode):** Use Blackmagic's Film or Extended Video gamma. Grade in post. Do not bake in a LUT on set.

### On-set workflow

- **Storage:** CFast 2.0 or USB-C SSD (depending on model). Carry multiple cards/drives.
- **Power:** Battery life is short (~45 min). Use V-mount or NP-F battery plates for extended shoots.
- **Audio:** Built-in mics are reference only. Use external recorder (Zoom, Sound Devices) or XLR adapter for serious audio.
- **Stabilization:** No IBIS. Use gimbal (DJI RS series), tripod, or shoulder rig for handheld. The lightweight body works well on gimbals.

---

## The Blackmagic ecosystem (broader context)

### Camera lineup (beyond BMPCC)

- **URSA Cine 12K LF:** Full-frame 12K, 16 stops dynamic range. Feature film territory.
- **URSA Cine 17K 65mm:** Largest sensor, ultimate image quality.
- **PYXIS 6K/12K:** Full-frame, compact cube design. L-mount.
- **Studio Camera 4K/6K:** Live production with built-in color corrector.

### Recording formats

- **Blackmagic RAW (BRAW):** Primary format. Visually lossless, CPU/GPU accelerated, smaller than ProRes RAW. 12-bit precision. Decodes natively in Resolve — no transcoding.
- **ProRes:** Industry-standard delivery format. Wide compatibility. Use for delivery or when collaborating with editors who don't use Resolve.

### Color science

- 5th generation Blackmagic color science. Wide gamut support. Film-like rendering.
- Accurate skin tones out of the box — one of the key reasons cinematographers choose Blackmagic.

### Production tools

- **ATEM switchers:** Multi-camera live switching and streaming.
- **Video Assist:** On-camera monitoring with focus assist, scopes, recording.
- **DeckLink / UltraStudio:** Capture and playback cards for post.
- **Blackmagic Cloud:** Remote collaboration, project sync, media sharing.

---

## Post-production pipeline

```
BMPCC 6K (BRAW) → DaVinci Resolve → Edit → Color → Deliver
```

1. **Import:** BRAW clips import directly into Resolve. No transcode needed.
2. **Edit:** Cut page (fast assembly) or Edit page (full NLE). Sync external audio.
3. **Color:** The star of Resolve. See davinci-resolve for full Color page workflow. Primary corrections (Lift/Gamma/Gain), secondaries (qualifiers, Power Windows), node-based grading.
4. **Audio:** Fairlight page for mixing, dialogue cleanup, music.
5. **Deliver:** Export to ProRes (master), H.264/H.265 (web), DNxHR (broadcast).

---

## Creative workflows with the BMPCC 6K

### Documentary / run-and-gun

- BMPCC 6K + 45mm T1.5 (fast, versatile). Handheld or small gimbal. BRAW 8:1 for longer recording times. External audio recorder.

### Narrative / short film

- All three IRIX lenses. Tripod and gimbal. BRAW 5:1 for best quality. Slate and external audio. Plan shots — storyboard or shot list.

### Surf / ocean

- BMPCC 6K in a waterproof housing (SPL, Nauticam). 15mm for in-the-barrel perspective, 150mm from the beach for compression. BRAW, high frame rate for slow-motion drops.

### Architecture / interiors

- 15mm IRIX for wide interiors. Tripod. Bracket exposures if needed (BRAW gives good latitude, but very high contrast scenes benefit from bracketing). Grade for atmosphere — warm vs cool.

### Music video

- All three lenses for variety. Gimbal for movement. Color grade aggressively — music videos tolerate and reward bold grading in Resolve.

---

## When to use WEB_SEARCH

New firmware, BRAW updates, specific IRIX compatibility, housing options, or current best accessories — use WEB_SEARCH and say when you looked it up.
