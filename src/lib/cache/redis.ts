import Redis from "ioredis";

let redisClient: Redis | null = null;

const memoryStore = new Map<string, { value: string; expires: number }>();

function getMemoryCache<T>(key: string): T | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expires) {
    memoryStore.delete(key);
    return null;
  }
  return JSON.parse(entry.value) as T;
}

function setMemoryCache<T>(key: string, data: T, ttlSeconds: number): void {
  memoryStore.set(key, {
    value: JSON.stringify(data),
    expires: Date.now() + ttlSeconds * 1000,
  });
}

function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      commandTimeout: 1000,
    });
    redisClient.on("error", () => {
      // Individual commands fall back to memory while this client reconnects.
    });
  }
  return redisClient;
}

export async function getCached<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return getMemoryCache<T>(key);
  try {
    const val = await redis.get(key);
    return val ? (JSON.parse(val) as T) : null;
  } catch {
    return getMemoryCache<T>(key);
  }
}

export async function setCached<T>(
  key: string,
  data: T,
  ttlSeconds: number,
): Promise<void> {
  const redis = getRedis();
  setMemoryCache(key, data, ttlSeconds);
  if (!redis) return;
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch {
    /* fallback to memory already done */
  }
}

export async function invalidate(key: string): Promise<void> {
  memoryStore.delete(key);
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    /* ignore */
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  for (const key of memoryStore.keys()) {
    if (key.includes(pattern.replace("*", ""))) memoryStore.delete(key);
  }
  const redis = getRedis();
  if (!redis) return;
  try {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = next;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== "0");
  } catch {
    /* ignore */
  }
}

export async function incrementCounter(
  key: string,
  ttlSeconds: number,
): Promise<number> {
  const redis = getRedis();
  if (redis) {
    try {
      return Number(await redis.eval(
        `local count = redis.call("INCR", KEYS[1])
         if redis.call("TTL", KEYS[1]) < 0 then
           redis.call("EXPIRE", KEYS[1], ARGV[1])
         end
         return count`,
        1,
        key,
        ttlSeconds,
      ));
    } catch {
      // Keep enforcing a per-process limit during Redis outages.
    }
  }

  const entry = memoryStore.get(key);
  if (entry && entry.expires > Date.now()) {
    const count = Number(entry.value) + 1;
    entry.value = JSON.stringify(count);
    return count;
  }
  setMemoryCache(key, 1, ttlSeconds);
  return 1;
}

export async function getCounter(key: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return getMemoryCache<number>(key) ?? 0;
  try {
    const val = await redis.get(key);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return getMemoryCache<number>(key) ?? 0;
  }
}
