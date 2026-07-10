// Cloudflare Pages builds this repo from the ROOT directory (output dir:
// dist/), so Pages Functions must live in a root-level functions/ folder —
// web/functions/ is never picked up by the deployment. This file re-exports
// the real implementation so per-listing Open Graph tags actually ship.
export { onRequestGet } from '../../web/functions/property/[id]';
