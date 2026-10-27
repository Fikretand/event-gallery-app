# Design: Confetti

The locked system. Every Hallmark run reads this first and pages share it. Change it on purpose; the file is the rule.

## System
- Genre: editorial
- Shape of the first page: Narrative Workflow (hero, figures, how it works, the argument with photographs, two ways in, prices, questions, close); dashboard and admin are app screens
- Theme: brand (the Confetti brand kept by the owner's request: paper, navy ink, terracotta, moss; Playfair Display over Inter)
- Axes: light/serif/warm · posture: Restrained

## Tokens
`src/app/tokens.css` is the source of truth (a Tailwind 4 `@theme static` block, so every role is a utility: `bg-paper`, `text-ink-2`, `border-rule`, `bg-accent`, `text-moss`). The roles:
```css
:root {
  --color-paper: oklch(97.8% 0.009 78);  --color-paper-2: oklch(94% 0.017 76);  --color-paper-3: oklch(90.5% 0.022 70);  --color-card: oklch(99.3% 0.005 78);
  --color-ink: oklch(24.5% 0.039 264);  --color-ink-2: oklch(38% 0.032 262);  --color-muted: oklch(49% 0.022 255);  --color-rule: oklch(88.5% 0.016 72);  --color-field-edge: oklch(63% 0.02 70);
  --color-accent: oklch(54% 0.15 39);  --color-accent-ink: oklch(99.3% 0.005 78);  --color-focus: oklch(55% 0.19 39);
  --color-moss: oklch(43% 0.045 171);  --color-error: oklch(46% 0.16 27);  --color-warning: oklch(52% 0.11 70);  --color-night: oklch(20.5% 0.012 48);
  --font-display: Playfair Display 600;  --font-body: Inter 400/600;  --font-outlier: JetBrains Mono (PINs, codes, links only);
  --radius-card: 16px;  --radius-inner: 10px;  --radius-image: 12px;  --radius-pill: 999px;  --shadow-card: 0 1px 2px (ink 6%);
}
```
The spacing scale (`--space-3xs` 2px to `--space-4xl` 144px), the type scale, the easings and the durations are the scaffold's and live in `tokens.css`. `base.css` holds what the Floor decided (focus ring, `overflow-x: clip`, heading measure).

## Controls
- Recipes in `globals.css` `@layer components`: `.btn` + `.btn-primary` (terracotta fill, once a screen), `.btn-secondary` (outlined), `.btn-quiet` (typographic), `.btn-danger` / `.btn-danger-quiet` (destructive, app only), `.btn-ink` (on the ink band)
- Marketing controls 48px; app controls `.btn-sm` 40px with a 44px hit area. Pills.
- Fields: `.field`, `.field-label`, `.field-hint`; 48px (40px with `.field-sm`), 10px radius, the edge at 3:1, the focus ring an inset outline.
- `<Button>`, `<Input>`, `<Panel>` and `<MarketingButtonLink>` wrap these recipes.

## Surfaces
Space, then a hairline (`border-rule`), then a well (`.well`, paper-2), then a card (`.card`: card colour, hairline border, no shadow). Never a card in a card. Bands change paper (`.band`) or go to ink for the close.

## Type
Labels, captions, table heads and chips are the body face, a step smaller, sentence case, untracked. Never an eyebrow over a heading. Heads are one weight (600) and one colour; stress is a second line at a second size, never an italic or coloured word.

## Copy
`copy: verbatim`: the owner's words and the spaced en dash stay. Never middle-dot meta strings or arrows glued to link text.

## Motion
- Character: calm; one settle on the hero; the phone and "how it works" play only on screen and stop under reduced motion.

## Exports
`tokens.css` in this project. Tailwind, DTCG or shadcn blocks are added here on request, per the skill's `export-formats.md`.
