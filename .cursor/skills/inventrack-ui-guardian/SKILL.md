---
name: inventrack-ui-guardian
description: Enforces high-quality UI consistency for INVENTRACK across light, dark, and pink themes. Use when building or polishing pages/components, updating styles, changing buttons/inputs/selects/tables/cards, or when the user asks for UI or design improvements.
---

# INVENTRACK UI Guardian

Use this skill for any frontend UI work in this repository.

## Scope

- Next.js App Router pages and layouts
- Shared UI primitives in `src/components/ui/`
- Theme tokens in `src/app/globals.css`
- Dashboard/admin screens that must look polished in all themes

## Hard Rules

1. Use shared primitives (`Button`, `Input`, `Select`, `Card`) instead of raw HTML controls when possible.
2. Do not hardcode random colors in page code if a token (`--primary`, `--accent`, `--border`, etc.) can be used.
3. Every UI change must look correct in:
   - default light
   - default dark
   - pink theme
4. Disabled controls must remain readable (not muddy or nearly invisible).
5. Empty states, loading states, and error states are required for user-facing pages.

## Workflow

Copy this checklist and complete it for each UI task:

```text
UI Task Checklist
- [ ] Identify affected shared primitives and pages
- [ ] Apply token-first styling (avoid one-off hardcoded colors)
- [ ] Verify contrast for text/buttons/borders in light/dark/pink
- [ ] Verify hover/focus/active/disabled states
- [ ] Verify empty/loading/error states
- [ ] Run build and fix all errors
```

## Theme QA Standards

When touching colors or controls, verify:

- Primary button is clearly visible and readable in all themes.
- Outline and ghost buttons are still visible against background cards.
- Select trigger, dropdown popup, and options are readable.
- Input borders are visible, with clear focus ring.
- Table header/body contrast remains legible.
- Badge/chip colors do not disappear in dark mode.

## Component Standards

### Buttons

- Prefer `variant` + `size` from `src/components/ui/button.tsx`.
- Keep primary for the main CTA only.
- Avoid multiple competing primary actions in the same row.

### Inputs and Selects

- Use `Input` and `Select` components first.
- Keep consistent heights within the same form row.
- Placeholder color should be muted but readable.

### Tables and Cards

- Preserve clear hierarchy:
  - heading
  - metadata/subtitle
  - content
  - actions
- Avoid excessive glow/shadow that hurts legibility.

## INVENTRACK-Specific Guidance

- Dashboard sidebar stays dark and should still harmonize with active theme accents.
- Pink theme uses `#FFB6C1`; do not replace it with unrelated pinks for primary accents.
- If a page-specific color tweak is needed, prefer token usage (`bg-primary/10`, `text-primary`) over literal hex in page files.

## Done Criteria

A UI change is done only when:

1. It compiles cleanly.
2. Primary flows are readable and actionable.
3. Light, dark, and pink themes all pass visual sanity checks.
4. No regressions in button/select/input usability.

## References

- For token and state guidance, see [TOKENS.md](TOKENS.md).
