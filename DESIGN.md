# Design

## Theme

Dark. Neon on black. The interface is a futuristic arcade cabinet: deep darkness punctuated by electric light. Every glow serves the rhythm.

## Color Strategy

Committed. One saturated primary (neon pink-red) carries 30-40% of interactive surfaces. Accent (electric cyan) provides contrast for secondary indicators. The darkness is the canvas; color is the signal.

## Palette

All values in OKLCH. Seed: `oklch(0.546 0.204 3.4)`.

```css
:root {
  /* Background — near-black, the void */
  --bg:        oklch(0.07 0.000 0);

  /* Surface — dark panels, cards, sidebars */
  --surface:   oklch(0.13 0.005 280);

  /* Surface elevated — modals, dropdowns, hover states */
  --surface-2: oklch(0.18 0.008 280);

  /* Ink — primary text, near-white on dark */
  --ink:       oklch(0.96 0.002 280);

  /* Muted — secondary text, labels, timestamps */
  --muted:     oklch(0.58 0.005 280);

  /* Primary — neon magenta-pink, the hero color */
  --primary:   oklch(0.62 0.22 350);

  /* Primary hover — slightly brighter */
  --primary-hover: oklch(0.68 0.22 350);

  /* Primary dim — subtle fills, backgrounds */
  --primary-dim: oklch(0.62 0.22 350) / 0.15;

  /* Accent — electric cyan, secondary contrast */
  --accent:    oklch(0.78 0.15 195);

  /* Accent hover */
  --accent-hover: oklch(0.84 0.15 195);

  /* Accent dim */
  --accent-dim: oklch(0.78 0.15 195) / 0.15;

  /* Success — green for positive states */
  --success:   oklch(0.72 0.18 145);

  /* Warning — amber for caution */
  --warning:   oklch(0.78 0.15 80);

  /* Error — red for destructive actions */
  --error:     oklch(0.65 0.22 25);

  /* Info — cyan variant for information */
  --info:      oklch(0.75 0.12 220);

  /* Grade colors */
  --grade-sss: oklch(0.85 0.18 95);   /* gold */
  --grade-ss:  oklch(0.70 0.15 240);  /* blue */
  --grade-s:   oklch(0.72 0.18 145);  /* green */
  --grade-a:   oklch(0.78 0.15 65);   /* orange */
  --grade-b:   oklch(0.55 0.02 280);  /* gray */

  /* Borders */
  --border:    oklch(0.22 0.005 280);
  --border-focus: oklch(0.62 0.22 350);

  /* Z-index scale */
  --z-base:    0;
  --z-dropdown: 100;
  --z-sticky:  200;
  --z-modal-backdrop: 300;
  --z-modal:   400;
  --z-toast:   500;
  --z-tooltip: 600;
}
```

## Typography

- **Family**: Inter (display + body + mono). One family, multiple weights.
- **Scale**: Fixed rem, tight ratio (1.2 between steps).
- **Weights**: 400 (body), 500 (labels, buttons), 600 (emphasis), 700 (headings)

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `--text-xs` | 0.75rem (12px) | 500 | Badges, timestamps |
| `--text-sm` | 0.875rem (14px) | 400 | Secondary text, labels |
| `--text-base` | 1rem (16px) | 400 | Body text |
| `--text-lg` | 1.125rem (18px) | 500 | Card titles, emphasis |
| `--text-xl` | 1.25rem (20px) | 600 | Section headings |
| `--text-2xl` | 1.5rem (24px) | 700 | Page titles |
| `--text-3xl` | 2rem (32px) | 700 | Hero text (max) |

Line height: 1.5 for body, 1.2 for headings. Letter spacing: 0 for body, -0.02em for headings.

## Spacing

8px base unit. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.

## Border Radius

- `--radius-sm`: 4px (buttons, inputs)
- `--radius-md`: 8px (cards, panels)
- `--radius-lg`: 12px (modals, large cards)
- `--radius-full`: 9999px (badges, pills)

## Shadows

Neon glow shadows instead of traditional drop shadows:

```css
--glow-primary: 0 0 20px oklch(0.62 0.22 350 / 0.3);
--glow-accent:  0 0 20px oklch(0.78 0.15 195 / 0.3);
--glow-sm-primary: 0 0 10px oklch(0.62 0.22 350 / 0.2);
--glow-sm-accent:  0 0 10px oklch(0.78 0.15 195 / 0.2);
```

## Components

All interactive components have: default, hover, focus, active, disabled, loading states.

### Buttons
- **Primary**: filled with `--primary`, white text, neon glow on hover
- **Secondary**: outlined with `--border`, `--ink` text, subtle fill on hover
- **Ghost**: no border, `--ink` text, `--surface-2` fill on hover
- **Danger**: filled with `--error`, white text

### Forms
- **Input**: `--surface` background, `--border` border, `--ink` text, `--primary` focus ring
- **Select**: same as input with custom dropdown arrow
- **Checkbox/Radio**: `--primary` fill when checked

### Cards
- `--surface` background, `--border` border, `--radius-md` radius
- No shadow by default; `--glow-primary` on hover for interactive cards

## Motion

- 150-250ms ease-out for most transitions
- Game-specific: approach circle scales from 2x to 1x over note duration
- Page transitions: 200ms crossfade
- Particle effects: 300ms burst with fade-out
- Reduced motion: disable particles and scale animations, keep opacity transitions

## Icons

Use Lucide icons (consistent stroke style, 1.5px stroke width).

## Layout

- Sidebar navigation (fixed left, 240px width)
- Top bar for user info and actions
- Content area with max-width 1200px, centered
- Game canvas: full viewport
