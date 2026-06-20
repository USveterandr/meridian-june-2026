// ScrapingBee client — fetches JS-rendered HTML for DR real-estate portals
// whose search/category grids hydrate client-side (supercasas.com,
// remax.com.do, century21dominicana.com all need a real browser to capture
// the full listing grid; a plain fetch only sees the pre-hydration shell).
//
// Requires the SCRAPINGBEE_API_KEY secret:
//   npx wrangler secret put SCRAPINGBEE_API_KEY

const SCRAPINGBEE_ENDPOINT = 'https://app.scrapingbee.com/api/v1/';

export interface ScrapingBeeOptions {
  /** Run a headless browser and execute JS before returning HTML. Default true. */
  renderJs?: boolean;
  /** Use ScrapingBee's premium/residential proxy pool (costs more credits). */
  premiumProxy?: boolean;
  /** Milliseconds to wait after page load for client-side rendering to finish. */
  waitFor?: number;
}

export async function fetchRenderedHtml(
  apiKey: string,
  targetUrl: string,
  opts: ScrapingBeeOptions = {}
): Promise<string> {
  const params = new URLSearchParams({
    api_key: apiKey,
    url: targetUrl,
    render_js: String(opts.renderJs ?? true),
  });
  if (opts.premiumProxy) params.set('premium_proxy', 'true');
  if (opts.waitFor) params.set('wait', String(opts.waitFor));

  const res = await fetch(`${SCRAPINGBEE_ENDPOINT}?${params.toString()}`);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ScrapingBee request for ${targetUrl} returned ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.text();
}
