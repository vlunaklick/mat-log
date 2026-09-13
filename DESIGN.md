# Mat Log design system

Monochrome gallery system inspired by Mobbin. The app chrome stays near-black ink on white; the user's own data (technique notes, roll outcomes, charts) is the only thing allowed to feel rich. Built on shadcn/ui (base-nova, Tailwind v4) with the tokens in `src/index.css`.

## Rules in one screen

- **Colors**: only semantic tokens. `bg-background`, `text-foreground`, `bg-surface` (soft canvas #f3f3f3), `bg-input` (field #f0f0f0), `border-border` (hairline #e0e0e0), `ring-border-soft` (soft hairline #f0f0f0), `text-muted-foreground` (#707070), `text-text-faint` (#adadad). Never raw Tailwind colors like `bg-slate-900` or `text-blue-400`.
- **Brand blue** `bg-brand text-brand-foreground` is the only chroma. Use it at most once or twice per screen, only for "decide now" signals: a due-review count, the one focus for next class, a "Popular" style badge. Never for CTAs, never for charts except the single highlighted series (`chart-5`).
- **No shadows.** Elevation is fill difference and hairlines. Level 0 flat canvas; level 1 `bg-surface` fill no border; level 2 white card with `ring-1 ring-border-soft` (the `Card` component already does this).
- **Pills everywhere.** `Button`, `Badge`, `ToggleGroup`, `Tabs`, nav items are all `rounded-full` already. Do not add `rounded-md` to interactive elements. Cards and containers are `rounded-3xl` (24px), inputs and media tiles `rounded-2xl` (16px).
- **Type**: Inter Variable. Headings 650 (`text-h1`, `text-h2`, `text-h3`, `text-title` utilities), body 450 (default), light 300 lead (`text-lead`), labels `text-label`. Sentence case, headlines end with a period ("Log today's class."). No letter-spacing, no all-caps.
- **Inputs** have a tint fill and no border at rest; the 2px ink ring appears on focus. Use `Field`, `FieldLabel`, `FieldDescription`, `FieldGroup` from shadcn for form layout. Option sets of 2 to 7 use `ToggleGroup`.
- **Spacing**: 4px base. Cards pad 20px, page gutters 16px mobile and 32px desktop, sections separated by 24 to 48px of empty canvas rather than dividers.
- **Icons**: `lucide-react`, passed as components, `data-icon="inline-start"` inside buttons, no sizing classes on icons inside components.
- **Empty states** use `Empty`; callouts use `Alert`; confirmations use `AlertDialog`; toasts via `toast()` from `sonner`.

## Layout

- Mobile (< 768px): single column, page padding 16px, floating stadium bottom nav pill (`AppShell` handles it), content ends with `pb-28` so the pill never covers it.
- Desktop (>= 768px): shadcn `Sidebar` on the left (icon + label, collapsible), content column max-width 960px centered with 32px gutters. Two-column grids for cards where there is room (`md:grid-cols-2`).
- Every page starts with a `PageHeader` (title in `text-h1` on desktop, `text-h2` on mobile, optional lead and optional primary action pill on the right).

## Components map

| Need | Use |
|---|---|
| Primary action | `Button` (ink pill) |
| Secondary action | `Button variant="outline"` (hairline pill) or `variant="secondary"` (soft pill) |
| Destructive | `Button variant="destructive"` inside an `AlertDialog` flow |
| Style gi/no-gi, energy 1-5, grades | `ToggleGroup type="single"` |
| Position filter chips | `ToggleGroup type="single"` with `variant="outline"` |
| Lists of records | `Card` per item, or a plain list with `Separator` rows |
| Stats | `StatTile` (in `src/components/app/stat-tile.tsx`) |
| Charts | inline SVG with `--chart-*` tokens, no library |
