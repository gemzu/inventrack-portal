---
name: inventrack-feature-parity
description: Ensures web implementation matches INVENTRACK mobile behavior and UX conventions. Use when porting features from mobile screens, closing parity gaps, or implementing app-like flows on web.
---

# INVENTRACK Feature Parity

Use this skill when the user asks for "like the app", parity, or exact behavior matching mobile.

## Parity Method

1. Read the corresponding mobile screen and data service flow.
2. Extract behavior contract:
   - filters
   - selection/batch actions
   - empty/loading/error states
   - permission restrictions
3. Implement on web with existing shared primitives.
4. Verify outputs and side effects match.

## Must-Match Areas

- Inventory: items/boxes toggles, filters, chips, batch actions
- Storefronts: facility/category/include/exclude filters
- Users: role hierarchy, destructive actions, facility assignment
- Invites/notifications/support flows

## Parity Checklist

```text
Feature Parity Checklist
- [ ] Mapped mobile behavior before coding
- [ ] Matched all critical filters/actions
- [ ] Matched role and permission constraints
- [ ] Matched empty/loading/error UX quality
- [ ] Verified data service function parity
```

## Implementation Notes

- Do not simplify away important app behavior.
- If web UX differs for desktop ergonomics, keep underlying behavior equivalent.
- Favor exact naming parity in service functions when possible.

