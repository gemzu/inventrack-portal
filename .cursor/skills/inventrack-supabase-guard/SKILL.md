---
name: inventrack-supabase-guard
description: Protects INVENTRACK backend changes by enforcing Supabase-safe patterns for schema usage, RLS expectations, null handling, and edge function calls. Use when editing data access, auth flows, edge functions, or Supabase-backed pages.
---

# INVENTRACK Supabase Guard

Use this skill for any change touching Supabase tables, queries, auth, or edge functions.

## Core Rules

1. Never assume non-null values from Supabase rows without checks.
2. Prefer centralized wrappers in `src/lib/dataService.ts` over ad-hoc page queries.
3. Keep snake_case <-> camelCase mapping consistent.
4. Edge function invocations must handle both transport error and payload error.
5. Permission-sensitive actions must enforce role checks in UI and backend.

## Required Checklist

```text
Supabase Guard Checklist
- [ ] Validate fields for null/undefined before rendering
- [ ] Keep query columns aligned with expected types
- [ ] Handle { error } and data.error for edge functions
- [ ] Verify role/permission guards for destructive actions
- [ ] Re-test affected create/update/delete flow end-to-end
- [ ] Run build and resolve type drift
```

## Query and Type Safety

- For ambiguous arrays from generic row types, use safe narrowing or explicit `unknown as TargetType[]` where needed.
- Do not cast blindly before checking required keys.
- If a page relies on optional relations, guard each nested access.

## Edge Function Pattern

Always follow:

1. call function
2. handle transport `error`
3. handle payload-level `data?.error`
4. show user-safe toast message
5. update local state only after success

## Regression Hotspots

- user creation/reset/delete flows
- organization/storefront creation
- inventory/boxes relations (`box_id`, `facility_id`)
- invites and role transitions

