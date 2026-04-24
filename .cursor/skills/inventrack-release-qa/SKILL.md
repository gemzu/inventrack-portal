---
name: inventrack-release-qa
description: Runs a strict release-quality workflow for INVENTRACK including build validation, theme-aware UI checks, deployment verification, and regression reporting. Use when finishing tasks, polishing features, or preparing previews/production-ready updates.
---

# INVENTRACK Release QA

Use this skill at the end of implementation work to ensure high confidence delivery.

## Goal

Ship changes that are:

- technically correct
- visually consistent
- theme-safe (light/dark/pink)
- deployment verified

## Execution Workflow

Copy this checklist into your working notes and complete all steps:

```text
Release QA Checklist
- [ ] Confirm scope and touched files
- [ ] Run full build and fix all errors
- [ ] Verify changed UI in light theme
- [ ] Verify changed UI in dark theme
- [ ] Verify changed UI in pink theme (#FFB6C1)
- [ ] Validate button/input/select/table states
- [ ] Validate empty/loading/error states
- [ ] Deploy preview and confirm success URL
- [ ] Summarize changes + known risks/gaps
```

## Required Commands

Run these for release verification:

1. `npm run build`
2. Deploy preview using project standard deployment flow
3. Re-check deployment output for:
   - successful build
   - ready state
   - preview URL

If build fails, do not proceed to final delivery summary until fixed.

## UI Quality Gates

For every changed page/component:

1. **Readability Gate**
   - Primary CTAs are clearly visible
   - Disabled controls still readable
   - Borders and text contrast are adequate

2. **Interaction Gate**
   - Hover/focus/active states visible
   - Form controls keep consistent sizing
   - Dropdown options and trigger text are legible

3. **State Gate**
   - Empty state exists and is informative
   - Loading state exists and is non-jarring
   - Error state provides actionable feedback

4. **Theme Gate**
   - Default light looks balanced
   - Default dark is not muddy
   - Pink theme visibly uses `#FFB6C1` accents

## Regression Watch List (INVENTRACK)

Always sanity-check these areas if related files are touched:

- `dashboard/inventory`
- `dashboard/users`
- `dashboard/boxes`
- `dashboard/storefronts`
- `dashboard/invites`
- `dashboard/whitelist`
- `dashboard/support`
- shared UI primitives in `src/components/ui/`
- `src/app/globals.css`
- `src/context/ThemeContext.tsx`

## Reporting Format

After QA, report:

1. What changed (high level)
2. Verification performed (build + theme checks + deploy)
3. Preview URL
4. Any residual risk (if any)

Keep reporting concise and factual.

## Stop Conditions

Do not claim completion if any of the following is true:

- Build is failing
- Theme regressions are visible
- Deployment failed or URL not ready
- Critical user flow in touched area is broken

## References

- For UI consistency standards, use [../inventrack-ui-guardian/SKILL.md](../inventrack-ui-guardian/SKILL.md)
- For token/state guidance, use [../inventrack-ui-guardian/TOKENS.md](../inventrack-ui-guardian/TOKENS.md)
