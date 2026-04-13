#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeSiteUrl(siteUrl) {
  const url = new URL(siteUrl);
  if (!url.pathname.endsWith('/')) {
    url.pathname = `${url.pathname}/`;
  }
  return url.toString();
}

function normalizeBasePath(siteUrl) {
  const url = new URL(siteUrl);
  let basePath = url.pathname || '/';

  if (!basePath.startsWith('/')) {
    basePath = `/${basePath}`;
  }

  if (!basePath.endsWith('/')) {
    basePath = `${basePath}/`;
  }

  return basePath;
}

function routeUrl(siteUrl, routePath) {
  if (routePath === '/') {
    return siteUrl;
  }

  return new URL(routePath.replace(/^\//, ''), siteUrl).toString();
}

function routeOutputPath(distDir, routePath) {
  if (routePath === '/') {
    return path.join(distDir, 'index.html');
  }

  return path.join(distDir, routePath.replace(/^\//, ''), 'index.html');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function replaceOrInsert(html, pattern, replacement, insertBefore = '</head>') {
  if (pattern.test(html)) {
    return html.replace(pattern, replacement);
  }

  const insertionPoint = html.lastIndexOf(insertBefore);
  if (insertionPoint === -1) {
    return `${html}\n${replacement}`;
  }

  return `${html.slice(0, insertionPoint)}${replacement}\n${html.slice(insertionPoint)}`;
}

function applyPageMetadata(html, { title, description, canonicalUrl }) {
  let updated = html;

  updated = replaceOrInsert(updated, /<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`);
  updated = replaceOrInsert(
    updated,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeHtml(description)}" />`,
  );
  updated = replaceOrInsert(
    updated,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
  );
  updated = replaceOrInsert(
    updated,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
  );
  updated = replaceOrInsert(
    updated,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
  );
  updated = replaceOrInsert(
    updated,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
  );
  updated = replaceOrInsert(
    updated,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
  );
  updated = replaceOrInsert(
    updated,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
  );

  if (!/rel="canonical"/.test(updated)) {
    updated = replaceOrInsert(
      updated,
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
      `$&\n    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    );
  }

  return updated;
}

function computePagesPathSegmentsToKeep(basePath) {
  const trimmed = basePath.replace(/^\//, '').replace(/\/$/, '');

  if (!trimmed) {
    return 0;
  }

  return trimmed.split('/').length;
}

function build404Html(template, pathSegmentsToKeep) {
  const scriptPattern = /var pathSegmentsToKeep = \d+;/;
  const scriptReplacement = `var pathSegmentsToKeep = ${pathSegmentsToKeep};`;
  const script = template.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1] ?? '';
  const updatedScript = script.replace(scriptPattern, scriptReplacement);

  const scriptHash = crypto.createHash('sha256').update(updatedScript, 'utf8').digest('base64');
  const cspPattern = /content="([^"]*script-src 'self' )'sha256-[^']+'([^\"]*)"/;

  let updated = template.replace(scriptPattern, scriptReplacement);
  updated = updated.replace(
    /content="default-src 'self'; script-src 'self' '[^']+'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' https: http:\/\/localhost:\* ws:\/\/localhost:\*; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self"/,
    `content="default-src 'self'; script-src 'self' 'sha256-${scriptHash}'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' https: http://localhost:* ws://localhost:*; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self"`,
  );

  return updated;
}

function renderSitemap(siteUrl, routes) {
  const entries = routes
    .map((route) => {
      const routeUrlValue = routeUrl(siteUrl, route.path);
      const changefreq = route.changefreq
        ? `    <changefreq>${escapeHtml(route.changefreq)}</changefreq>\n`
        : '';
      const priority =
        typeof route.priority === 'number'
          ? `    <priority>${route.priority.toFixed(1)}</priority>\n`
          : '';

      return [
        '  <url>',
        `    <loc>${escapeHtml(routeUrlValue)}</loc>`,
        changefreq.trimEnd(),
        priority.trimEnd(),
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function main() {
  const [distDirArg, siteUrlArg, manifestPathArg] = process.argv.slice(2);

  if (!distDirArg || !siteUrlArg || !manifestPathArg) {
    console.error(
      'Usage: node apps/frontend/scripts/generate-pages-artifacts.mjs <dist-dir> <site-url> <manifest-path>',
    );
    process.exit(1);
  }

  const distDir = path.resolve(distDirArg);
  const manifestPath = path.resolve(manifestPathArg);
  const siteUrl = normalizeSiteUrl(siteUrlArg);
  const basePath = normalizeBasePath(siteUrl);
  const templatePath = path.join(distDir, 'index.html');
  const templateHtml = fs.readFileSync(templatePath, 'utf8');
  const routes = readJson(manifestPath);

  fs.mkdirSync(distDir, { recursive: true });

  for (const route of routes) {
    const outputPath = routeOutputPath(distDir, route.path);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const metadata = {
      title: route.title,
      description: route.description,
      canonicalUrl: routeUrl(siteUrl, route.path),
    };

    fs.writeFileSync(outputPath, applyPageMetadata(templateHtml, metadata), 'utf8');
  }

  const robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${siteUrl}sitemap.xml\n`;
  fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsTxt, 'utf8');
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), renderSitemap(siteUrl, routes), 'utf8');

  const public404Path = path.join(__dirname, '../public/404.html');
  const public404Html = fs.readFileSync(public404Path, 'utf8');
  const updated404 = build404Html(public404Html, computePagesPathSegmentsToKeep(basePath));
  fs.writeFileSync(path.join(distDir, '404.html'), updated404, 'utf8');

  console.log(`Generated Pages artifacts for ${siteUrl}`);
}

main();
