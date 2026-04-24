---
name: inventrack-design-system-enforcer
description: Enforces design-system consistency in INVENTRACK by standardizing shared UI primitives, spacing, typography, and state behavior across pages. Use when refactoring UI or preventing style drift.
---

# INVENTRACK Design System Enforcer

Use this skill to keep UI coherent as the app grows.

## Enforcement Rules

1. Prefer shared primitives over custom one-off controls.
2. Keep spacing scale consistent within each section.
3. Maintain visual hierarchy: title -> subtitle -> content -> actions.
4. Keep CTA patterns consistent (primary, secondary, destructive).
5. Avoid mixing unrelated visual languages on the same page.

## Quick Audit

```text
Design System Audit
- [ ] Uses shared components (Button/Input/Select/Card)
- [ ] Consistent spacing rhythm (no random gaps)
- [ ] Consistent heading and body text sizing
- [ ] Consistent action placement (top-right, row actions, footer)
- [ ] Consistent hover/focus/disabled behavior
```

## Theme Consistency

- Use token-based classes for color (`primary`, `accent`, `muted`, `border`).
- Avoid page-specific color hacks unless truly necessary.
- Recheck visual quality in light, dark, and pink themes.

