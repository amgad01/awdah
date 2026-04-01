#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

function extractContentSecurityPolicy(html, filePath) {
  const match = html.match(
    /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?>/i,
  );

  if (!match) {
    throw new Error(`${filePath}: missing Content-Security-Policy meta tag`);
  }

  return match[1];
}

function extractInlineScripts(html, filePath) {
  const matches = Array.from(html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi));

  if (matches.length !== 1) {
    throw new Error(`${filePath}: expected exactly one inline script, found ${matches.length}`);
  }

  return matches[0][1];
}

function extractScriptHash(csp, filePath) {
  const scriptSrc = csp
    .split(';')
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith('script-src '));

  if (!scriptSrc) {
    throw new Error(`${filePath}: missing script-src directive in CSP`);
  }

  const match = scriptSrc.match(/'sha256-([^']+)'/);
  if (!match) {
    throw new Error(`${filePath}: missing sha256 hash in script-src directive`);
  }

  return match[1];
}

function sha256Base64(value) {
  return createHash('sha256').update(value, 'utf8').digest('base64');
}

const files = process.argv.slice(2);

if (files.length === 0) {
  console.error('Usage: node scripts/verify-inline-script-csp.mjs <html-file> [more-files...]');
  process.exit(1);
}

let failed = false;

for (const filePath of files) {
  try {
    const html = readFileSync(filePath, 'utf8');
    const csp = extractContentSecurityPolicy(html, filePath);
    const inlineScript = extractInlineScripts(html, filePath);
    const expectedHash = extractScriptHash(csp, filePath);
    const actualHash = sha256Base64(inlineScript);

    if (actualHash !== expectedHash) {
      failed = true;
      console.error(`${filePath}: CSP hash mismatch`);
      console.error(`  expected: sha256-${expectedHash}`);
      console.error(`  actual:   sha256-${actualHash}`);
      continue;
    }

    console.log(`✓ ${filePath}: inline script hash matches CSP`);
  } catch (error) {
    failed = true;
    console.error(error instanceof Error ? error.message : String(error));
  }
}

if (failed) {
  process.exit(1);
}
