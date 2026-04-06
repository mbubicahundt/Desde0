import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Netlify build-time config injection for a static (no-build) vanilla frontend.
//
// Usage (Netlify env var):
// - Set NETLIFY_API_BASE_URL to your Railway backend URL, e.g. https://my-api.up.railway.app
//
// This script overwrites frontend/src/js/config.js in the deploy artifact.

const apiBaseUrl =
  process.env.NETLIFY_API_BASE_URL ??
  process.env.API_BASE_URL ??
  process.env.VITE_API_BASE_URL; // fallback if user already has it

if (!apiBaseUrl) {
  console.warn(
    '[netlify] NETLIFY_API_BASE_URL is not set; leaving default frontend config as-is.',
  );
  process.exit(0);
}

const normalized = String(apiBaseUrl).replace(/\/$/, '');

const targetPath = resolve('frontend', 'src', 'js', 'config.js');
const content = `// Frontend runtime config (static hosting)\n// This file can be overwritten during Netlify build via NETLIFY_API_BASE_URL.\nwindow.__APP_CONFIG__ = {\n  API_BASE_URL: '${normalized}',\n};\n`;

writeFileSync(targetPath, content, { encoding: 'utf8' });
console.log(`[netlify] Wrote API_BASE_URL to ${targetPath}: ${normalized}`);
