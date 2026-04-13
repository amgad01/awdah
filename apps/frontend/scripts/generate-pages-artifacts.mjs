#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function normalizeSiteUrl(siteUrl) {
  const url = new URL(siteUrl);

  if (!url.pathname.endsWith('/')) {
    url.pathname = `${url.pathname}/`;
  }

  return url.toString();
}

function resolveRouteUrl(siteUrl, routePath) {
  if (routePath === '/') {
    return siteUrl;
  }

  return new URL(routePath.replace(/^\//, ''), siteUrl).toString();
}

function replaceTag(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    throw new Error(`Unable to update ${label} in the Pages HTML template.`);
  }

  return html.replace(pattern, replacement);
}

function upsertCanonicalLink(html, canonicalUrl) {
  const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`;
  const canonicalPattern = /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i;

  if (canonicalPattern.test(html)) {
    return html.replace(canonicalPattern, canonicalTag);
  }

  const descriptionPattern = /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i;

  if (!descriptionPattern.test(html)) {
    throw new Error('Unable to insert a canonical link because the description meta tag is missing.');
  }

  return html.replace(descriptionPattern, (match) => `${match}\n    ${canonicalTag}`);
}

function renderRouteHtml(template, route, routeUrl) {
  let html = template;

  html = replaceTag(
    html,
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(route.title)}</title>`,
    'page title',
  );
  html = replaceTag(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(route.description)}" />`,
    'description meta tag',
  );
  html = upsertCanonicalLink(html, routeUrl);
  html = replaceTag(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
    'Open Graph title',
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
    'Open Graph description',
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${escapeHtml(routeUrl)}" />`,
    'Open Graph URL',
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`,
    'Twitter title',
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
    'Twitter description',
  );

  return html;
}

function renderSitemap(siteUrl, routes) {
  const urls = routes
    .map((route) => {
      const routeUrl = resolveRouteUrl(siteUrl, route.path);

      return `  <url>
    <loc>${escapeHtml(routeUrl)}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function renderRobots(siteUrl) {
  return `User-agent: *
Allow: /
Sitemap: ${siteUrl}sitemap.xml
`;
}

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
const routes = JSON.parse(readFileSync(manifestPath, 'utf8'));
const indexPath = path.join(distDir, 'index.html');
const indexTemplate = readFileSync(indexPath, 'utf8');

for (const route of routes) {
  const routeUrl = resolveRouteUrl(siteUrl, route.path);
  const routeHtml = renderRouteHtml(indexTemplate, route, routeUrl);
  const outputPath =
    route.path === '/'
      ? indexPath
      : path.join(distDir, route.path.replace(/^\//, ''), 'index.html');

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, routeHtml, 'utf8');
}

writeFileSync(path.join(distDir, 'robots.txt'), renderRobots(siteUrl), 'utf8');
writeFileSync(path.join(distDir, 'sitemap.xml'), renderSitemap(siteUrl, routes), 'utf8');
