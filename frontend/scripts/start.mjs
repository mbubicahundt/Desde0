import http from 'node:http';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import handler from 'serve-handler';

function normalizeBaseUrl(value) {
  return String(value).trim().replace(/\/$/, '');
}

function maybeWriteFrontendConfig() {
  const apiBaseUrl =
    process.env.API_BASE_URL ??
    process.env.RAILWAY_API_BASE_URL ??
    process.env.NETLIFY_API_BASE_URL ??
    process.env.VITE_API_BASE_URL;

  if (!apiBaseUrl) {
    console.log(
      '[frontend] API_BASE_URL not set; keeping existing src/js/config.js default.',
    );
    return;
  }

  const normalized = normalizeBaseUrl(apiBaseUrl);
  const targetPath = resolve('src', 'js', 'config.js');
  const content = `// Frontend runtime config (static hosting)\n// This file can be overwritten at runtime via API_BASE_URL (Railway).\nwindow.__APP_CONFIG__ = {\n  API_BASE_URL: '${normalized}',\n};\n`;

  writeFileSync(targetPath, content, { encoding: 'utf8' });
  console.log(`[frontend] Wrote API_BASE_URL to ${targetPath}: ${normalized}`);
}

maybeWriteFrontendConfig();

const port = Number(process.env.PORT ?? 3000);
const server = http.createServer((request, response) => {
  return handler(request, response, {
    public: 'src',
  });
});

server.listen(port, () => {
  console.log(`[frontend] Serving ./src on port ${port}`);
});
