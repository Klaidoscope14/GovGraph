interface CacheEntry<TValue> {
  value: TValue;
  expiresAt: number;
}

export class TtlCache<TValue> {
  private readonly entries = new Map<string, CacheEntry<TValue>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): TValue | null {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: TValue) {
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  clear() {
    this.entries.clear();
  }
}

export function stableCacheKey(parts: readonly unknown[]) {
  return JSON.stringify(parts, (_key, value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return value;
    }

    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = (value as Record<string, unknown>)[key];
        return result;
      }, {});
  });
}

