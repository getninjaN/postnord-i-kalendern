# 📬 PostNord i Kalendern

![Vercel](https://vercelbadge.vercel.app/api/getninjaN/postnord-i-kalendern)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

**Get your PostNord delivery days right in your calendar** — auto-updating `.ics` feed based on your Swedish postal code.

Inspired by [Weather in your Calendar](https://weather-in-calendar.com/), but for mail instead of weather. Built with ❤️ for simplicity and utility.


## 🚀 Demo

👉 [PostNord i Kalendern](https://postnord-i-kalendern.se)

---

## 🔧 Tech Stack

- [Astro](https://astro.build) – static site generator
- [Vercel](https://vercel.com) – hosting & edge functions
- [Upstash Redis](https://upstash.com/) – caching + rate limiting
- iCalendar `.ics` – calendar file generation
- PostNord's public API – delivery day data

---

## ✨ Features

- 🗓️ Add to Google Calendar, Apple Calendar, Outlook, etc.
- 📦 Emoji icons for different styles (📬 ✉️ 📦)
- 🇸🇪 Works for Swedish postal codes only
- ⚡️ No login required, fast and lightweight
- 🔁 Auto-refreshes daily

---

## 🛠️ Setup

```sh
git clone https://github.com/getninjaN/postnord-i-kalendern.git
cd postnord-i-kalendern
pnpm install
```

Create a .env or .env.local file with the following:
```
VERCEL_API_TOKEN=
VERCEL_TEAM_ID=
VERCEL_OIDC_TOKEN=

KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=
REDIS_URL=
```

Then run the dev server:
```
pnpm dev
```

---

## 🔐 Notes
* Not affiliated with PostNord.
* Calendar feeds are .ics files refreshed automatically by your calendar app.
* Rate limiting is handled via Redis to avoid excessive hits to PostNord's API.

---

## 🙌 Credits
* Idea inspired by [Weather in your Calendar](https://weather-in-calendar.com/)

---

## 💬 Feedback / Ideas?
Issues and PRs welcome! Or say hi on [Product Hunt](https://www.producthunt.com/products/postnord-i-kalendern)
