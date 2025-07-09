import type { APIRoute } from "astro";
import { Redis } from '@upstash/redis';
import { rateLimit } from "../../utils/rateLimit";

type PostNordResponse = {
  postalCode: string;
  city: string;
  delivery: string;
  upcoming: string;
};

const redisClient = new Redis({
  url: import.meta.env.KV_REST_API_URL || "",
  token: import.meta.env.KV_REST_API_TOKEN || ""
});

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const postalCode = form.get("postalCode")?.toString().replace(/\s/g, "") ?? null;

  if (!postalCode) {
    return new Response(JSON.stringify({ error: "Inget postnummer angivet" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitKey = `ratelimit_${ip}`;

  const rateLimitStatus = await rateLimit({
    client: redisClient,
    key: rateLimitKey,
    windowSeconds: 60 * 60, // 1 hour
    maxRequests: import.meta.env.DEV ? Infinity : 10,
  });

  if (!rateLimitStatus.allowed) {
    return new Response(JSON.stringify({
      error: "För många förfrågningar, försök igen senare.",
      retryAfterSeconds: rateLimitStatus.retryAfterSeconds,
    }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": rateLimitStatus.retryAfterSeconds.toString(),
      },
    });
  }

  const cacheKey = `pn_${postalCode}`;
  const cachedEntry = await redisClient.get(cacheKey);

  if (cachedEntry) {
    return new Response(JSON.stringify(cachedEntry), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=86400"
      }
    });
  }

  try {
    const postnordApiResponse = await fetch(
      `https://portal.postnord.com/api/sendoutarrival/closest?postalCode=${postalCode}`
    );

    if (!postnordApiResponse.ok) {
      console.log(postnordApiResponse)
      return new Response(JSON.stringify({ error: "Fel vid kontakt med PostNord" }), {
        status: postnordApiResponse.status,
        statusText: postnordApiResponse.statusText,
        headers: { "Content-Type": "application/json" },
      });
    }

    const postnordData = await postnordApiResponse.json() as PostNordResponse;
    const randomBuffer = Math.floor(Math.random() * 60 * 10); // up to 10 extra minutes
    await redisClient.set(cacheKey, postnordData, { ex: 86400 + randomBuffer }); // 1 day

    return new Response(JSON.stringify(postnordData), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=86400"
      }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Ett oväntat fel uppstod" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};