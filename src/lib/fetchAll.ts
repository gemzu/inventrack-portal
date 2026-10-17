/* Every row, not the first 1,000.

   The database answers a request with at most 1,000 rows (PostgREST
   max_rows). Pages that loaded a whole list in one request - inventory,
   the dashboard, reports - would quietly show the first 1,000 and work
   their totals out from those. One customer had 606 stock lines on
   2026-10-17 and was adding over a hundred a night. This asks page by
   page until a short page says there is no more.

   `make` builds a fresh query each time (a query can only run once); it
   must have an order, so the pages do not overlap. */

type PageResult<T> = PromiseLike<{ data: T[] | null; error: unknown }>;
type Ranged<T> = { range: (from: number, to: number) => PageResult<T> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows are as loosely typed as the supabase client returns them
export async function fetchAll<T = any>(make: () => Ranged<T>, pageSize = 1000): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await make().range(from, from + pageSize - 1);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
