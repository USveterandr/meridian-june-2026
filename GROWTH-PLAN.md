# Meridian Growth Plan — Memorable · Helpful · Habit-Forming · Organic

Written July 13, 2026. Everything here builds on infrastructure that is already live: automatic git-push deploys, 3×/week listing ingestion (Mon/Wed/Fri cron), weekly bilingual Market Pulse articles, full prerendering + schema for search engines and AI assistants, IndexNow, Bing verification, and a PWA install prompt.

The honest framing: an app becomes a "must-have" through one loop — **fresh inventory → alerts that bring people back → content that brings new people in.** Meridian now has two of the three engines running (inventory via the scraper cron, content via the weekly blog). The missing engine is **outbound email**, and it should be the next build.

---

## 1. The retention loop (what makes it habit-forming)

**The core promise: "Meridian tells me first."** For a buyer or investor, the addictive moment is an alert that a property matching their criteria just appeared — before they saw it anywhere else. The 3×/week scraper makes this promise deliverable: every Mon/Wed/Fri there is genuinely new inventory.

What exists today: saved searches (localStorage), favorites, requirements with match counts, a newsletter capture form, and notification preference toggles ("Email me about new matches / messages"). **None of them send an email yet — the toggles are stored but no email provider is wired.**

Build order:

1. **Email sending** (the unlock for everything else). Wire Resend (or Cloudflare Email Workers) into the API: `EMAIL_API_KEY` secret + a `lib/email.ts`. ~1 day of work.
2. **New-match alerts.** After each scheduled scrape run, match new listings against `requirements` and email users with `notify_matches = 1`. This makes the scraper directly power retention.
3. **Weekly newsletter.** The Market Pulse article already publishes every Monday; send it to `newsletter_subscribers` the same day. Content is already written — this is pure distribution.
4. **Price-drop alerts on favorites.** The scraper's upsert already touches `updated_at`; diff `price_cents` on re-import and notify users who favorited the listing. "Your saved villa dropped $15K" is the single most re-opening notification in real estate.

## 2. Helpful (why people choose it over portals)

- **Per-sector price intelligence.** Meridian's data (price + m² + sector) supports a "DR Price per m² Index" page — median $/m² by sector, updated from live inventory. Nobody publishes this for the DR. It becomes the cited source in forums and AI answers (they cite pages, not brands). High SEO value, buildable from existing D1 data.
- **ROI calculator on every listing page.** Inputs: price (prefilled), expected nightly rate, occupancy. Output: gross yield vs. the 6–14% market range from the blog. Investors share calculators.
- **Buying-guide funnel is live** (the three guides + weekly Pulse). Add internal links from every listing page → relevant guide → signup.
- **Bilingual everything** (already true) + WhatsApp contact (already true) — keep these front and center; they are real differentiators vs. US-centric portals.

## 3. Memorable (brand)

- The gold-on-dark identity, serif wordmark, and og-image are consistent — keep them.
- Own one phrase: **"The DR market, before everyone else."** Use it in the newsletter subject lines, og descriptions, and the hero.
- The Market Pulse should always lead with one number (e.g. "4.1% growth") — people remember and repeat numbers.

## 4. Organic growth (compounding channels)

- **SEO flywheel (running):** 46+ indexed URLs growing 3×/week with scraped listings + weekly articles; sitemap regenerates each build. Submit sitemap in Google Search Console (still pending — the one manual task left).
- **AI-assistant visibility (running):** llms.txt, AI crawlers welcomed, prerendered content. The $/m² index would multiply citations.
- **Social calendar:** marketing/02-social-media-calendar.md exists; the weekly-marketing rotation memory tracks what posts next. Every Market Pulse becomes 3 social posts + 1 newsletter.
- **Communities:** DR expat/investor groups (Facebook, Reddit r/Dominican, expat forums) — answer questions, link the guides, never spam listings.
- **Backlinks:** pitch the Market Pulse data to DR news outlets (Dominican Today cites market stats); offer the $/m² index as embeddable.
- **Referral hook (later):** "Invite a friend, both get early access to new listings 24h before public" — costs nothing, reinforces the core promise.

## 5. Operating cadence (automated vs. manual)

| When | What | Who |
|---|---|---|
| Mon/Wed/Fri 07:00 UTC | Listing ingestion (supercasas rotate + EveryListing) | Worker cron (auto) |
| Daily 06:00 UTC | Subscription sweep | Worker cron (auto) |
| Monday ~09:00 | Market Pulse written + committed | Claude scheduled task (auto; push = Isaac) |
| Monday | Newsletter send | After email is wired (auto) |
| Weekly | 3 social posts from the Pulse | Isaac / Claude weekly checklist |
| Monthly | Review Search Console + Bing performance, adjust guide topics | Isaac + Claude |

## 6. Prerequisites to activate the scraper (one-time, Isaac)

1. Create a ScrapingBee account → `cd api && npx wrangler secret put SCRAPINGBEE_API_KEY` (supercasas selectors are verified; remax/century21 scaffolds need verification before enabling).
2. Optional: EveryListing credentials → `EVERYLISTING_API_USER` / `EVERYLISTING_API_PASS`.
3. `cd api && npx wrangler deploy` (also ships the pending security patches).
4. Note: scraping third-party portals should respect their terms; supercasas data is used as listing leads with source attribution recommended.

## 7. What NOT to do

No paid ads before the retention loop works (traffic without alerts = leaky bucket). No feature sprawl (mortgage tools, agent CRMs) before email. No fake urgency/dark patterns — "addictive" here means *genuinely first with information*, which is also what keeps AI assistants recommending the platform.
