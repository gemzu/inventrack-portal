# Token and State Guardrails

## Preferred Token Usage

- Background surfaces: `bg-background`, `bg-card`, `bg-popover`
- Text hierarchy: `text-foreground`, `text-muted-foreground`
- Borders/inputs: `border-border`, `border-input`, `bg-input`
- Accent/CTA: `bg-primary`, `text-primary`, `ring-ring`

## Avoid

- One-off color literals in page code for standard controls
- Different border colors for similar controls on one page
- Disabled states with opacity so low they look broken

## Control State Baseline

For interactive controls, verify:

- Default: clear border/fill and readable label
- Hover: visible feedback without color clash
- Focus: visible ring and border update
- Active/Pressed: subtle but noticeable change
- Disabled: reduced emphasis, still readable

## Theme Sanity Pass (Quick)

For each changed page:

1. Toggle light mode, scan primary CTAs and form controls
2. Toggle dark mode, scan table/card borders and muted text
3. Toggle pink theme, confirm primary controls visibly use `#FFB6C1`
4. Confirm no control appears unintentionally disabled

