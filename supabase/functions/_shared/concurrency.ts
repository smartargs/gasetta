/**
 * Run a worker over a list with bounded concurrency.
 *
 *   const results = await pool(items, 5, async (item) => doWork(item));
 *
 * - N workers race to take the next item until the list is exhausted.
 * - Order of completion is *not* preserved — but `results[i]` corresponds to
 *   `items[i]`, so output ordering matches input ordering.
 * - The worker is responsible for its own try/catch if partial failures
 *   shouldn't take siblings down (typical pattern: return a discriminated
 *   union or null on error rather than throw).
 *
 * Why bounded: unbounded Promise.all on a long list will saturate downstream
 * rate limits and may exhaust function memory. A fixed pool gives predictable
 * resource use and lets natural backpressure work.
 */
export async function pool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const n = Math.max(1, Math.min(concurrency, items.length));
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function take(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: n }, () => take()));
  return results;
}
