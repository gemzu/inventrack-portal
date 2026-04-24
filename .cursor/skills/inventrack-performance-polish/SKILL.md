---
name: inventrack-performance-polish
description: Optimizes INVENTRACK frontend performance by reducing unnecessary rerenders, heavy client work, and expensive UI operations. Use when pages feel slow, lists are large, or interactions lag.
---

# INVENTRACK Performance Polish

Use for dashboard-heavy pages with filters, tables, and modals.

## Focus Areas

- Expensive list filtering/sorting on each render
- Large modal content mounted unnecessarily
- Repeated derived computations without memoization
- Overly heavy animation/shadow usage in dense tables

## Checklist

```text
Performance Checklist
- [ ] Memoize heavy derived data (filters/counts/maps)
- [ ] Avoid hook/order anti-patterns and conditional hooks
- [ ] Keep large overlays lazily rendered when closed
- [ ] Minimize repeated array scans in render paths
- [ ] Build passes after optimization
```

## Safe Optimization Rules

- Preserve behavior first, optimize second.
- Do not trade away readability for tiny gains.
- Prioritize clear wins in user-perceived latency.

