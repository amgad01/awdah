import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { generatePagesArtifacts } from '../../scripts/generate-pages-artifacts.mjs';

function createTemplateHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Base Title</title>
    <meta name="description" content="Base description" />
    <meta property="og:title" content="Base OG Title" />
    <meta property="og:description" content="Base OG Description" />
    <meta property="og:url" content="https://example.com/base/" />
    <meta name="twitter:title" content="Base Twitter Title" />
    <meta name="twitter:description" content="Base Twitter Description" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;
}

describe('generate-pages-artifacts', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it(
    'generates route entrypoints, robots.txt, and sitemap.xml from the manifest',
    { timeout: 30000 },
    () => {
      const tempDir = mkdtempSync(path.join(tmpdir(), 'awdah-pages-artifacts-'));
      tempDirs.push(tempDir);

      const distDir = path.join(tempDir, 'dist');
      const manifestPath = path.join(tempDir, 'public-routes.json');
      const indexPath = path.join(distDir, 'index.html');

      const routes = [
        {
          path: '/',
          title: 'Awdah Home',
          description: 'Track your ibadah with clarity.',
          changefreq: 'weekly',
          priority: 1.0,
        },
        {
          path: '/about',
          title: 'About Awdah',
          description: 'Learn how the app works.',
          changefreq: 'monthly',
          priority: 0.7,
        },
      ];

      writeFileSync(manifestPath, JSON.stringify(routes), 'utf8');
      mkdirSync(distDir, { recursive: true });
      writeFileSync(indexPath, createTemplateHtml(), 'utf8');

      generatePagesArtifacts(distDir, 'https://example.com/awdah', manifestPath);

      const rootHtml = readFileSync(indexPath, 'utf8');
      const aboutHtmlPath = path.join(distDir, 'about', 'index.html');
      const aboutHtml = readFileSync(aboutHtmlPath, 'utf8');
      const robotsTxt = readFileSync(path.join(distDir, 'robots.txt'), 'utf8');
      const sitemapXml = readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');

      expect(existsSync(aboutHtmlPath)).toBe(true);
      expect(rootHtml).toContain('<title>Awdah Home</title>');
      expect(rootHtml).toContain('<link rel="canonical" href="https://example.com/awdah/" />');
      expect(aboutHtml).toContain('<title>About Awdah</title>');
      expect(aboutHtml).toContain(
        '<meta property="og:url" content="https://example.com/awdah/about" />',
      );
      expect(robotsTxt).toContain('Sitemap: https://example.com/awdah/sitemap.xml');
      expect(sitemapXml).toContain('<loc>https://example.com/awdah/</loc>');
      expect(sitemapXml).toContain('<loc>https://example.com/awdah/about</loc>');
    },
  );
});
