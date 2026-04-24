# INVENTRACK Web Portal — UI polish rules

Mirrors the mobile `UI_POLISH.md`. These rules are the baseline for every
page, component, and interaction in the web portal. Deviations need a
comment explaining why.

## 1. Page scaffolding

- Every top-level page is wrapped in `<PageShell>` from
  `src/components/page-shell.tsx`. It provides: consistent padding,
  breadcrumb slot, title + subtitle, optional header-action row, and the
  standard entrance motion.
- Never render a bare `<h1>` at the root of a page. Put the title in
  `<PageShell title=…>` so it picks up the shared type scale.

```tsx
<PageShell
  title="Boxes"
  subtitle={`${boxes.length} containers`}
  actions={<Button onClick={open}>+ New Box</Button>}
>
  … page body …
</PageShell>
```

## 2. Tappable surfaces

- All buttons use shadcn `<Button>` with `size` / `variant` props.
- No raw `<button>` in page files — the only exception is inside a
  primitive component (`ui/*`).
- Icon-only buttons use `<Button variant="ghost" size="icon" />` with an
  `aria-label`.

## 3. Entrance motion

- `<PageShell>` runs a single fade+translateY on mount. Lists inside a
  page should not stagger individually — one motion per page. Heavy
  per-row animation is a known performance hit in large tables.

## 4. Cards

- Hero / summary blocks use `<GlassCard>` from
  `src/components/glass-card.tsx` — translucent bg + backdrop-blur +
  border.
- Plain content blocks use shadcn `<Card>` → `<CardContent>`.
- No raw `<div className="rounded-xl border bg-card p-6">` — pick one of
  the two wrappers so we can restyle globally.

## 5. Tables

- Tables sit inside a `<Card className="overflow-hidden">`.
- Header row: `text-xs uppercase tracking-wider text-muted-foreground`,
  sticky when the table is tall.
- Row hover: `hover:bg-black/3 dark:hover:bg-white/3`.
- Pagination uses shadcn `<Button>` pairs (`Prev` / `Next`) — no ad-hoc
  arrow widgets.

## 6. Colors

- No hex literals in component files. Use the CSS variables from the
  design system: `bg-background`, `text-foreground`, `text-primary`,
  `text-muted-foreground`, `border-border`, `bg-card`, etc.
- Exception: per-box user-picked colors (stored in DB) may render as raw
  hex via inline `style={{ backgroundColor: box.color }}`.

## 7. Empty states

- Every list / table renders `<EmptyState>` when it has no rows. Never a
  bare "Nothing here yet." paragraph.

## 8. Loading + error

- Initial load: `<Skeleton>` rows that match the final layout, not a
  centred spinner.
- Errors in mutations: toast via `useToast()` (`sonner` under the hood).
  Never `alert()`.
- Errors in reads: inline error banner inside the page, with a retry
  button where possible.

## 9. Forms

- Modals open via shadcn `<Dialog>`. Side panels via `<Sheet>`. Don't
  hand-roll overlays — the primitives handle focus-trap + escape key.
- Form fields use shadcn `<Input>` / `<Select>` / `<Textarea>`.
- The primary action button sits in `<DialogFooter>`.

## 10. Role-based UI

- Role + permission checks go through `src/lib/roles.ts`
  (`isSuperadmin`, `isOwner`, `canManage`). Components never compare
  strings like `role === "admin"` directly.

## 11. Destructive actions

- Confirmations use shadcn `<Dialog>` with a `destructive` variant
  `<Button>` as the primary action. Never `window.confirm()`.
- User-affecting destructive actions (reset password, delete user) go
  through the edge functions in `dataService.ts`
  (`adminResetPassword`, `adminDeleteUser`).

## 12. Multi-role portal routes

- `/dashboard/*` — admin / worker.
- `/buyer/*` — buyer-only.
- Layouts redirect the wrong-role user to the right place. The sidebar
  is built from role-filtered nav groups; never conditionally hide links
  with CSS.
