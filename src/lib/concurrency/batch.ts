export async function mapWithConcurrency<TInput, TOutput>(
  items: readonly TInput[],
  concurrency: number,
  mapper: (item: TInput, index: number) => Promise<TOutput>
): Promise<TOutput[]> {
  if (items.length === 0) {
    return [];
  }

  const workerCount = Math.max(1, Math.min(Math.floor(concurrency), items.length));
  const results = new Array<TOutput>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

export function createSingleFlight<TValue>() {
  const inFlight = new Map<string, Promise<TValue>>();

  return async function runOnce(key: string, loader: () => Promise<TValue>): Promise<TValue> {
    const existing = inFlight.get(key);
    if (existing) {
      return existing;
    }

    const promise = loader().finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, promise);
    return promise;
  };
}

