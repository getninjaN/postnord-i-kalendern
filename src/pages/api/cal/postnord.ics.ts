// REFRESH-INTERVAL;VALUE=DURATION:P1D
// X-PUBLISHED-TTL:P1D

import type { APIRoute } from "astro";
import { Redis } from "@upstash/redis";
import { format, parse } from "date-fns";
import { sv } from "date-fns/locale/sv";

type IconKey = "postbox" | "package" | "letter";

const redis = new Redis({
  url: import.meta.env.KV_REST_API_URL || "",
  token: import.meta.env.KV_REST_API_TOKEN || "",
});

function formatAsICSDate(date: Date) {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

function sanitizeEmoji(icon: string) {
  const emojiMap = {
    postbox: "📬",
    package: "📦",
    letter: "✉️",
  };
  return emojiMap[icon as IconKey] ?? "📬";
}

export const GET: APIRoute = async ({ url }) => {
  const postalCode = url.searchParams.get("postalCode")?.replace(/\s/g, "");
  const icon = sanitizeEmoji(url.searchParams.get("icon") || "postbox");

  if (!postalCode) {
    return new Response("Missing postalCode", { status: 400 });
  }

  const cacheKey = `pn_${postalCode}`;
  const data = await redis.get(cacheKey) as {
    delivery: string;
    upcoming: string;
    postalCode: string;
    city: string;
  } | null;

  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const now = new Date();
  const events = [];

  for (const label of ["delivery", "upcoming"] as const) {
    const date = parse(data[label], "d MMMM, yyyy", new Date(), { locale: sv });
    const dtstamp = formatAsICSDate(now);
    const dtstart = formatAsICSDate(date);
    const uid = `${label}-${postalCode}@postnord-i-kalendern.se`;

    events.push([
      `BEGIN:VEVENT`,
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dtstart.slice(0, 8)}`,
      `SUMMARY;LANGUAGE=sv:${icon} Utdelning i ${data.city}`,
      `X-FUNAMBOL-ALLDAY:1`,
      `X-MICROSOFT-CDO-ALLDAYEVENT:TRUE`,
      `DESCRIPTION;LANGUAGE=sv:${label === "delivery" ? "Planerad utdelning" : "Kommande utdelning"} från PostNord`,
      `STATUS:CONFIRMED`,
      `TRANSP:TRANSPARENT`,
      `CLASS:PUBLIC`,
      `END:VEVENT`
    ])
  }

  const calendar = [
    `BEGIN:VCALENDAR`,
    `VERSION:2.0`,
    `CALSCALE:GREGORIAN`,
    `PRODID:-//postnord-i-kalendern.se//Postnord Calendar//SV`,
    `NAME:PostNord utdelningar - ${data.city}`,
    `X-WR-CALNAME:PostNord utdelningar - ${data.city}`,
    `METHOD:PUBLISH`,
    `X-PUBLISHED-TTL:PT12H`,
    `REFRESH-INTERVAL;VALUE=DURATION:PT12H`,
    ...events.flat(),
    `END:VCALENDAR`,
  ].join("\r\n") + "\r\n"

  return new Response(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="postnord-${postalCode}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
};
