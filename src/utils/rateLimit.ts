type RedisClient = {
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<0 | 1>;
  ttl: (key: string) => Promise<number>;
};

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export async function rateLimit({
  client,
  key,
  windowSeconds,
  maxRequests,
}: {
  client: RedisClient;
  key: string;
  windowSeconds: number;
  maxRequests: number;
}): Promise<RateLimitResult> {
  const count = await client.incr(key);

  if (count === 1) {
    // First hit → set TTL
    await client.expire(key, windowSeconds);
  }

  if (count > maxRequests) {
    const ttl = await client.ttl(key);
    return {
      allowed: false,
      retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
    };
  }

  return { allowed: true };
}
