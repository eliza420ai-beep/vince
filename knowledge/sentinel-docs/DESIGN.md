# LIVETHELIFETV / IKIGAI STUDIO / CLAWTERM — Design System

**Human Interface Guidelines · Apple HIG–inspired**

*No hype. No shilling. Battle-tested signal from the trenches.*

---

## Brand attributes

| Attribute | Definition |
|-----------|------------|
| **Brand / product** | LIVETHELIFETV (holding) · IKIGAI STUDIO (content) · IKIGAI LABS (product) · CLAWTERM (terminal) · VINCE (multi-agent system) |
| **Personality** | Minimalist, professional, confident craft (Porsche OG), benefit-led (Apple-style). Direct, grounded, zero AI-slop. |
| **Primary emotion** | Trust (battle-tested signal, no shilling) and calm confidence (sovereignty, conviction). |
| **Target audience** | Traders and builders who need unified crypto data, paper perp context, weekly options ritual, and a Bloomberg-like terminal. Secondary: lifestyle (Kelly), capital (Solus), coders (Sentinel). |

---

# 1. FOUNDATIONS

## 1.1 Color system

### Primary palette (6 colors)

| Name | Hex | RGB | HSL | OKLCH (source of truth) | WCAG AA (on white) | WCAG AAA | Usage |
|------|-----|-----|-----|-------------------------|--------------------|----------|--------|
| **Background (dark)** | `#1f1d1e` | 31, 29, 30 | 330°, 4%, 12% | `oklch(0.2029 0.0037 345.62)` | — | — | Page, panels, cards (dark mode default) |
| **Foreground** | `#fafafa` | 250, 250, 250 | 0°, 0%, 98% | `oklch(0.9851 0 0)` | ✓ | ✓ | Primary text |
| **Primary** | `#6d66e8` | 109, 102, 232 | 244°, 75%, 65% | `oklch(0.4703 0.2364 263.19)` | ✓ | ✓ | CTAs, links, active states |
| **Muted** | `#3d3a3b` | 61, 58, 59 | 330°, 3%, 23% | `oklch(0.2393 0 0)` | — | — | Secondary surfaces, sidebar |
| **Primary (light)** | `#343233` | 52, 50, 51 | 330°, 2%, 20% | `oklch(0.205 0 0)` | — | — | Primary in light mode |
| **Border** | `#2a2829` | 42, 40, 41 | 330°, 3%, 16% | `oklch(0.269 0 0)` | — | — | Dividers, card outlines (dark) |

### Semantic colors

| Role | Light | Dark | Hex (dark) | Usage |
|------|--------|------|------------|--------|
| **Success** | `oklch(0.7775 0.2447 144.9)` | same | ~`#4ade80` | Positive, returns, confirmations |
| **Warning** | `oklch(0.769 0.188 70.08)` | same | ~`#facc15` | Alerts, caution, pending |
| **Error / Destructive** | `oklch(0.577 0.245 27.325)` | `oklch(0.5961 0.2006 36.48)` | ~`#dc2626` | Errors, delete, danger |
| **Info** | `oklch(0.488 0.243 264.376)` | same (chart-1) | ~`#6366f1` | Informational, links in copy |

### Dark mode equivalents and contrast

| Pairing | Contrast ratio | Passes |
|---------|----------------|--------|
| Foreground on Background (dark) | 14.2:1 | AAA |
| Primary on Background (dark) | 4.8:1 | AA (large text) |
| Muted-foreground on Background (dark) | 5.1:1 | AA |
| Success on Background (dark) | 5.2:1 | AA |
| Destructive on Background (dark) | 4.5:1 | AA (large) |

### Color usage rules

- **Background / Card:** One level of elevation; card can match background or use `muted` for subtle separation.
- **Foreground:** All primary reading text. Never use for large solid areas.
- **Primary:** One primary action per context (e.g. “Submit”, “Connect wallet”). Links in body copy. Do not overuse.
- **Muted / Muted-foreground:** Secondary text, captions, placeholders, disabled labels.
- **Success:** Positive P&L, completed states, “saved”, “connected”.
- **Warning:** Reversible risk, “paper only”, “testnet”, pending.
- **Destructive:** Irreversible actions, errors, disconnect, delete.
- **Chart 1–5:** Data visualization only; keep consistent mapping (e.g. Chart 1 = primary series).

---

## 1.2 Typography

### Primary font family

| Use | Font | Weights / style | Notes |
|-----|------|----------------|-------|
| **Display / Headlines** | **Rebels** | Normal (single weight) | Sharp, technical, cinematic. Use sparingly. |
| **Body / UI / Code** | **Roboto Mono** | 400, 500, 700 | Clear data and body text; monospace for numbers and code. |

Roboto Mono is the workhorse. Rebels is for hero headlines and section titles only.

### Type scale (9 roles)

| Role | Size (px) | Line height | Letter spacing | Use |
|------|-----------|-------------|----------------|-----|
| **Display** | 48 (mobile) / 56 (tablet) / 64 (desktop) | 1.1 | -0.02em | Hero, one per view |
| **Headline** | 32 / 36 / 40 | 1.2 | -0.01em | Page title |
| **Title** | 24 / 28 | 1.25 | 0 | Card title, modal title |
| **Body** | 16 | 1.5 | 0 | Default body |
| **Callout** | 15 | 1.45 | 0 | Emphasized body, lead paragraph |
| **Subheadline** | 14 | 1.4 | 0 | Labels, list headers |
| **Footnote** | 12 | 1.35 | 0 | Captions, timestamps, hints |
| **Caption** | 11 | 1.3 | 0.01em | Overlines, tags, badges |

### Desktop / tablet / mobile

- **Desktop (≥1024px):** Use right column for size (e.g. Display 64px).
- **Tablet (768–1023px):** Middle column (e.g. Display 56px).
- **Mobile (&lt;768px):** Left column (e.g. Display 48px). Body stays 16px; never smaller than 11px for Caption.

### Font pairing strategy

- **Rebels + Roboto Mono:** Default. Rebels for Display/Headline only; Roboto Mono for everything else.
- **No third font** in product UI. Marketing/Substack may use one editorial serif for long-form only.

### Accessibility: minimum sizes

- **Body:** 16px minimum (already default).
- **Caption/Footnote:** 11px minimum; ensure contrast ≥4.5:1 (AA) for small text.
- **Touch targets:** Minimum 44×44px; buttons and tabs respect this.

---

## 1.3 Layout grid

- **Desktop:** 12 columns, max width 1440px, margin 24px (or 32px) each side.
- **Tablet:** 12 columns, 768px viewport, margin 16px.
- **Mobile:** 4 columns (or 6), 375px design width, margin 16px.

### Gutter and margin

| Breakpoint | Gutter | Margin | Columns |
|------------|--------|--------|---------|
| 375px (mobile) | 16px | 16px | 4 |
| 768px (tablet) | 24px | 16px | 12 |
| 1440px (desktop) | 24px | 24px (or 32px) | 12 |

### Breakpoint definitions

```css
/* Reference (Tailwind-style) */
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1440px
```

### Safe areas

- Respect `env(safe-area-inset-top/bottom/left/right)` for notched devices.
- Minimum safe padding: 16px from notch/home indicator on phones.

---

## 1.4 Spacing system

Base unit **8px**. Scale:

| Token | Value | Use |
|-------|--------|-----|
| `space-0` | 0 | Reset |
| `space-1` | 4px | Icon–label gap, tight inline |
| `space-2` | 8px | Inline elements, list item padding |
| `space-3` | 12px | Form field padding, small gaps |
| `space-4` | 16px | Default padding, section gaps |
| `space-6` | 24px | Card padding, block spacing |
| `space-8` | 32px | Section separation |
| `space-12` | 48px | Major sections |
| `space-16` | 64px | Hero / layout blocks |
| `space-24` | 96px | Page-level rhythm |
| `space-32` | 128px | Maximum vertical rhythm |

Use even steps (4, 8, 12, 16, 24, 32, 48, 64, 96, 128) only. No 20px or 28px unless legacy.

---

# 2. COMPONENTS (30+)

## 2.1 Navigation

### Header

- **Anatomy:** Logo/wordmark, nav links, wallet/account, optional search.
- **Height:** 56px (mobile 48px). Padding horizontal = `space-4`.
- **States:** Default, scrolled (optional background opacity), active nav item (primary color + underline or weight).
- **Accessibility:** `role="banner"`, `nav` with `aria-label="Main"`, focus visible on all links.
- **Specs:** `padding: 16px 24px`, `border-bottom: 1px solid var(--border)`.

### Tab bar (bottom, mobile)

- **Anatomy:** 3–5 icons + labels.
- **Height:** 56px + safe-area-inset-bottom.
- **States:** Default, selected (primary color), disabled (muted).
- **Accessibility:** `role="tablist"`, `aria-selected`, keyboard arrow navigation.
- **Specs:** `padding: 8px 0`, icon 24px, label 10px Caption.

### Sidebar

- **Anatomy:** Logo, nav groups, labels, expand/collapse.
- **Width:** 240px (expanded), 64px (collapsed, icons only).
- **States:** Default, hover (accent), active (primary + left border 3px), collapsed.
- **Accessibility:** `aria-expanded` on collapse, `aria-current="page"` for current route.
- **Specs:** `--sidebar` bg, `--sidebar-foreground`, `--sidebar-accent` hover; border-right `var(--sidebar-border)`.

### Breadcrumbs

- **Anatomy:** Separator (chevron or slash), links, current page (non-link).
- **States:** Default, hover (underline), current (muted, no hover).
- **Accessibility:** `nav` with `aria-label="Breadcrumb"`, `aria-current="page"` on last item.
- **Specs:** Subheadline 14px, separator margin 8px, color muted-foreground for current.

---

## 2.2 Input

### Buttons (6 variants)

| Variant | Background | Foreground | Border | Use |
|---------|------------|------------|--------|-----|
| **Primary** | primary | primary-foreground | none | One main CTA per context |
| **Secondary** | secondary | secondary-foreground | border | Secondary actions |
| **Outline** | transparent | foreground | border | Tertiary, low emphasis |
| **Ghost** | transparent | foreground | none | Inline, table actions |
| **Destructive** | destructive | white | none | Delete, disconnect |
| **Link** | transparent | primary | none | Looks like link, button semantics |

- **States:** default, hover (slight lighten/darken), active (press), disabled (opacity 0.5, no pointer), loading (spinner + disabled).
- **Sizes:** sm (h 32px, px 12px), md (h 40px, px 16px), lg (h 48px, px 24px).
- **Specs:** `border-radius: var(--radius)` (e.g. 10px), focus ring 2px offset.

### Text fields

- **Anatomy:** Label, input, placeholder, helper/error message, optional leading/trailing icon.
- **Height:** 40px (md), 32px (sm). Padding horizontal 12px.
- **States:** default, hover (border emphasis), focus (ring primary), error (border destructive, message), disabled (muted bg).
- **Accessibility:** `label` associated with `id`, `aria-invalid`, `aria-describedby` for error/helper.
- **Specs:** `border: 1px solid var(--input)`, `border-radius: var(--radius-md)`.

### Dropdowns (select / combobox)

- **Anatomy:** Trigger (value or placeholder), chevron, list (option list).
- **States:** closed, open (list visible), hover option, selected option, disabled.
- **Accessibility:** `role="combobox"` or native `select`, `aria-expanded`, `aria-activedescendant`, keyboard arrow + Enter.
- **Specs:** Same height as text field; list shadow `0 4px 12px rgba(0,0,0,0.15)`.

### Toggles (switch)

- **Anatomy:** Track, thumb. On = primary bg; Off = muted.
- **Size:** Height 24px, width 44px; thumb 20px.
- **States:** off, on, hover, disabled, focus.
- **Accessibility:** `role="switch"`, `aria-checked`, keyboard toggle.
- **Specs:** `border-radius: 9999px` track and thumb.

### Checkboxes

- **Anatomy:** Box (16×16px), checkmark. Checked = primary bg + white check.
- **States:** unchecked, checked, indeterminate, disabled, focus.
- **Accessibility:** `role="checkbox"`, `aria-checked`, `aria-disabled`.
- **Specs:** `border-radius: 4px`, border 2px.

### Radio buttons

- **Anatomy:** Circle 16×16px, filled circle when selected.
- **States:** unchecked, checked, disabled, focus.
- **Accessibility:** `role="radio"`, `aria-checked`, same `name` in group.
- **Specs:** `border-radius: 50%`.

### Sliders

- **Anatomy:** Track, thumb, optional value label.
- **States:** default, hover, active (dragging), disabled, focus.
- **Accessibility:** `role="slider"`, `aria-valuemin/max/now`, arrow keys.
- **Specs:** Track height 4px, thumb 20px, `border-radius: 9999px`.

---

## 2.3 Feedback

### Alerts (inline)

- **Anatomy:** Icon (success/warning/error/info), message, optional action.
- **Variants:** success (green border + bg tint), warning (amber), error (red), info (primary tint).
- **States:** default, dismissible (close icon).
- **Accessibility:** `role="alert"` or `aria-live="polite"`, icon `aria-hidden`.
- **Specs:** `padding: 12px 16px`, `border-radius: var(--radius-md)`, left border 4px.

### Toasts

- **Anatomy:** Icon, message, optional action button. Position: bottom-center or top-right.
- **States:** visible, dismiss (auto or click), stacking.
- **Accessibility:** `aria-live="polite"`, `role="status"`, focus trap until dismissed.
- **Specs:** `max-width: 360px`, shadow, `border-radius: var(--radius-lg)`.

### Modals / dialogs

- **Anatomy:** Overlay, container, title, body, footer (actions).
- **States:** open, close (overlay click or Esc).
- **Accessibility:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (title), focus trap, Esc to close.
- **Specs:** Overlay `bg-black/50`, container `border-radius: var(--radius-xl)`, padding 24px.

### Progress indicators

- **Linear:** Track + fill (primary). Height 4px or 8px. Optional label %.
- **Circular:** Ring, stroke primary, stroke-dasharray for value.
- **States:** indeterminate (animated), determinate (0–100%).
- **Accessibility:** `aria-valuenow` (determinate), `aria-valuetext` optional.
- **Specs:** `border-radius: 9999px` for linear.

### Skeleton screens

- **Anatomy:** Placeholder blocks (rectangles) with shimmer animation.
- **Use:** While content loads. Match layout of real content.
- **Specs:** `background: linear-gradient(90deg, var(--muted) 25%, var(--muted-foreground)/10% 50%, var(--muted) 75%)`, `background-size: 200%`, animate.

---

## 2.4 Data display

### Cards

- **Anatomy:** Container, optional image/icon, title, description, footer/actions.
- **States:** default, hover (optional subtle shadow), active (e.g. selected).
- **Specs:** `background: var(--card)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-lg)`, padding 24px.

### Tables

- **Anatomy:** Table, thead, tbody, th, td, optional sort icons, row hover.
- **States:** default, row hover (muted bg), sorted column (icon + aria-sort).
- **Accessibility:** `role="table"`, `scope="col"` on th, caption or `aria-label`.
- **Specs:** Cell padding 12px 16px, border-bottom 1px on rows.

### Lists (simple / with avatars)

- **Anatomy:** List item, optional leading (avatar/icon), primary line, secondary line, trailing (action).
- **States:** default, hover, selected.
- **Specs:** Min height 48px, padding 12px 16px.

### Stats (KPI blocks)

- **Anatomy:** Label (Footnote), value (Title or Headline), optional delta (positive/negative), optional sparkline.
- **Specs:** Use Success/Destructive for delta; align numbers right if in grid.

### Charts

- **Use chart-1–5** for series. Primary series = chart-1 (align with primary when single series). Ensure sufficient contrast; avoid red/green only (use shape + color).
- **Specs:** Axis labels Footnote, legend Subheadline; touch targets for legend ≥44px.

---

## 2.5 Media

### Image containers

- **Aspect ratios:** 16:9 (hero), 1:1 (avatar/grid), 4:3 (cards). Use `object-fit: cover` where crop is OK.
- **Specs:** `border-radius: var(--radius-md)` or `var(--radius-lg)`; loading skeleton optional.

### Video players

- **Anatomy:** Video surface, controls (play, progress, volume, fullscreen). Minimal UI preferred.
- **Specs:** Controls overlay on hover/focus; `border-radius: var(--radius-lg)`.

### Avatars

- **Sizes:** sm 24px, md 32px, lg 40px, xl 48px, 2xl 64px.
- **States:** default, offline (muted or ring), error (fallback initial or icon).
- **Specs:** `border-radius: 50%`, `object-fit: cover`; fallback bg muted, initial in Caption.

---

# 3. PATTERNS

## 3.1 Page templates

- **Landing:** Hero (Display + CTA), value props (3 columns), social proof, footer. Dark default; primary CTA once.
- **Dashboard:** Header + sidebar, main content area (grid of cards/widgets), optional right rail. Use spacing-gap for widget gaps.
- **Settings:** Sidebar or tabs for sections; form groups with Title per section; primary button “Save” at bottom.
- **Profile:** Avatar + name + meta, tabs (e.g. Activity, Portfolio), list or cards below.
- **Checkout / Connect:** Short flow; progress steps optional; one primary CTA per step; clear back/cancel.

## 3.2 User flows

- **Onboarding:** Short (3–5 steps). Progress indicator, one question per screen, Skip where appropriate.
- **Authentication:** Wallet connect or email; clear “Connect” vs “Disconnect”; error states for wrong network/failure.
- **Search:** Input with icon; results list or grid; empty state “No results for X”; recent searches optional.
- **Filtering:** Filters in sidebar or bar above list; chips for active filters; “Clear all”; URL sync if applicable.
- **Empty states:** Illustration or icon + Headline + Body + one CTA. No dead ends.

## 3.3 Feedback patterns

- **Success:** Toast or inline alert; optional “Undo” for reversible actions.
- **Error:** Inline near field or toast; message human-readable; retry or fix path.
- **Loading:** Skeleton for lists/cards; spinner for buttons or full page.
- **Empty:** Message + CTA (e.g. “No positions yet” + “Open first trade”).

---

# 4. TOKENS (developer handoff)

Design token structure (JSON). Map to CSS variables in `src/frontend/index.css` where present.

```json
{
  "brand": {
    "name": "LIVETHELIFETV",
    "product": "CLAWTERM / VINCE",
    "tagline": "No hype. No shilling. No timing the market."
  },
  "color": {
    "light": {
      "background": "oklch(1 0 0)",
      "foreground": "oklch(0.145 0 0)",
      "primary": "oklch(0.205 0 0)",
      "primaryForeground": "oklch(0.985 0 0)",
      "muted": "oklch(0.97 0 0)",
      "mutedForeground": "oklch(0.556 0 0)",
      "border": "oklch(0.922 0 0)",
      "success": "oklch(0.7775 0.2447 144.9)",
      "warning": "oklch(0.769 0.188 70.08)",
      "destructive": "oklch(0.577 0.245 27.325)"
    },
    "dark": {
      "background": "oklch(0.2029 0.0037 345.62)",
      "foreground": "oklch(0.9851 0 0)",
      "primary": "oklch(0.4703 0.2364 263.19)",
      "primaryForeground": "oklch(0.9851 0 0)",
      "muted": "oklch(0.2393 0 0)",
      "mutedForeground": "oklch(0.708 0 0)",
      "border": "oklch(1 0 0 / 10%)",
      "success": "oklch(0.7775 0.2447 144.9)",
      "warning": "oklch(0.769 0.188 70.08)",
      "destructive": "oklch(0.5961 0.2006 36.48)"
    }
  },
  "typography": {
    "fontFamily": {
      "display": "\"Rebels\", sans-serif",
      "body": "\"Roboto Mono\", monospace"
    },
    "scale": {
      "display": { "mobile": "48px", "tablet": "56px", "desktop": "64px" },
      "headline": { "mobile": "32px", "tablet": "36px", "desktop": "40px" },
      "title": "24px",
      "body": "16px",
      "callout": "15px",
      "subheadline": "14px",
      "footnote": "12px",
      "caption": "11px"
    },
    "lineHeight": {
      "display": "1.1",
      "headline": "1.2",
      "title": "1.25",
      "body": "1.5",
      "callout": "1.45",
      "subheadline": "1.4",
      "footnote": "1.35",
      "caption": "1.3"
    }
  },
  "spacing": {
    "0": "0",
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "6": "24px",
    "8": "32px",
    "12": "48px",
    "16": "64px",
    "24": "96px",
    "32": "128px"
  },
  "radius": {
    "sm": "calc(var(--radius) - 4px)",
    "md": "calc(var(--radius) - 2px)",
    "lg": "var(--radius)",
    "xl": "calc(var(--radius) + 4px)",
    "base": "0.625rem"
  },
  "breakpoints": {
    "sm": "640px",
    "md": "768px",
    "lg": "1024px",
    "xl": "1280px",
    "2xl": "1440px"
  },
  "layout": {
    "maxWidth": "1440px",
    "gutter": "24px",
    "marginMobile": "16px",
    "marginDesktop": "24px"
  }
}
```

---

# 5. DOCUMENTATION

## 5.1 Design principles (3)

1. **Benefit-led clarity (Apple-style)**  
   Every screen answers “what do I get?” first. Lead with outcome, not features. One primary action per context. No clutter.

2. **Confident craft (Porsche OG)**  
   Precision in alignment, spacing, and typography. Restraint in color and effects. Quality in micro-interactions and states. No decorative excess.

3. **Trust through consistency**  
   Same patterns for the same tasks. Predictable navigation and feedback. Accessible contrast and focus. Dark default for the terminal feel; light optional.

## 5.2 Do's and Don'ts (10)

| # | Do | Don’t |
|---|----|--------|
| 1 | Use primary for one main CTA per view | Use primary for every button |
| 2 | Use Rebels only for Display/Headline | Use Rebels for body or long text |
| 3 | Respect 8px spacing scale | Use arbitrary values (e.g. 18px, 22px) |
| 4 | Provide focus and hover states for all interactive elements | Rely only on color for state |
| 5 | Use semantic colors (success/warning/destructive) for meaning | Use green/red without semantic role |
| 6 | Design empty and error states for every list/form | Leave blank screens with no message |
| 7 | Keep dark mode as default for product UI | Force light-only in terminal context |
| 8 | Use OKLCH (or CSS vars) as source of truth for color | Hardcode hex in components |
| 9 | Pair labels with inputs and use ARIA where needed | Use placeholder as only label |
| 10 | Match copy to brand voice (no AI-slop, benefit-led) | Use hype, jargon, or generic “Learn more” |

## 5.3 Implementation guide for developers

- **CSS:** Use existing `src/frontend/index.css` theme. Prefer `var(--primary)`, `var(--background)`, etc. Do not introduce new hex/OKLCH in components; extend theme if needed.
- **Tailwind:** Use `@theme inline` and theme keys (`bg-background`, `text-foreground`, `font-display`, `font-mono`). Use spacing tokens (`p-4`, `gap-6`) rather than arbitrary values.
- **Components:** Prefer one component per pattern (e.g. Button, Card, Modal). Support `variant` and `size` via props; map to tokens.
- **Accessibility:** Every interactive element focusable and with visible focus ring (`outline-ring/50` or equivalent). Use `aria-*` and semantic HTML (`button`, `nav`, `main`).
- **Testing:** Verify contrast (e.g. 4.5:1 for body text); test keyboard nav and one screen reader flow for critical paths.

---

*Design system v1.0 · LIVETHELIFETV · IKIGAI STUDIO · IKIGAI LABS · CLAWTERM · [BRANDING.md](BRANDING.md) · [DRAGONFLY_PITCH.md](DRAGONFLY_PITCH.md)*
