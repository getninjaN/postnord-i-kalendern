import type { APIRoute } from "astro";
import { get, set } from "@vercel/edge-config";

type PostNordResponse = {
  postalCode: string;
  city: string;
  delivery: string;
  upcoming: string;
}

export const POST: APIRoute = async ({ params, request }) => {
  const form = await request.formData()
  const postalCode = form?.get("postalCode")?.toString()?.replaceAll(/\s/gm, "") ?? null

  if (!postalCode) {
    return new Response(JSON.stringify({ error: "Inget postnummer angivet" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateKey = `ratelimit:${ip}`;
  const current = (await get(rateKey)) as number | undefined;

  if (current && current >= 10) {
    return new Response(JSON.stringify({ error: "För många förfrågningar, försök igen senare." }), {
      status: 429,
      headers: { "Content-Type": "application/json" }
    });
  }
  await set(rateKey, (current || 0) + 1, { ttl: 60 * 60 }); // 1 hour

  const cacheKey = `pn:${postalCode}`;
  const cached = await get(cacheKey);

  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=86400"
      }
    });
  }

  try {
    const response = await fetch(`https://portal.postnord.com/api/sendoutarrival/closest?postalCode=${postalCode}`)
    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Fel vid kontakt med PostNord"}), {
        status: response.status,
        statusText: response.statusText,
        headers: {
          "Content-Type": "application/json"
        },
      })
    }
    
    const data = (await response.json()) as PostNordResponse
    const { postalCode, city } = data

    await set(cacheKey, data, { ttl: 60 * 60 * 24 * 30 }); // 30 days

    return new Response(JSON.stringify({ postalCode, city }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=86400"
      }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: "Ett oväntat fel uppstod" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
}