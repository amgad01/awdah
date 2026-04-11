import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function resolveDistDir(scriptUrl = import.meta.url) {
  const scriptDir = path.dirname(fileURLToPath(scriptUrl));
  return path.resolve(scriptDir, '../dist/assets');
}

const distDir = resolveDistDir();

const budgets = [
  { label: 'main app', pattern: /^app-.*\.js$/, maxBytes: 380 * 1024 },
  { label: 'chart vendor', pattern: /^chart-vendor-.*\.js$/, maxBytes: 400 * 1024 },
  { label: 'swiper vendor', pattern: /^swiper-vendor-.*\.js$/, maxBytes: 110 * 1024 },
  { label: 'english locale', pattern: /^en-.*\.js$/, maxBytes: 40 * 1024 },
  { label: 'arabic locale', pattern: /^ar-.*\.js$/, maxBytes: 55 * 1024 },
  { label: 'german locale', pattern: /^de-.*\.js$/, maxBytes: 45 * 1024 },
];

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

export function runBundleBudgetCheck() {
  if (!fs.existsSync(distDir)) {
    console.error(`Bundle budget check failed: missing build output at ${distDir}`);
    process.exit(1);
  }

  const assetFiles = fs.readdirSync(distDir);
  const failures = [];

  for (const budget of budgets) {
    const fileName = assetFiles.find((file) => budget.pattern.test(file));

    if (!fileName) {
      failures.push(`Missing asset for ${budget.label} (${budget.pattern})`);
      continue;
    }

    const filePath = path.join(distDir, fileName);
    const size = fs.statSync(filePath).size;

    if (size > budget.maxBytes) {
      failures.push(
        `${budget.label} exceeded budget: ${fileName} is ${formatKiB(size)} (limit ${formatKiB(
          budget.maxBytes,
        )})`,
      );
      continue;
    }

    console.log(
      `✓ ${budget.label}: ${fileName} is ${formatKiB(size)} (limit ${formatKiB(budget.maxBytes)})`,
    );
  }

  if (failures.length > 0) {
    console.error('Bundle budget check failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runBundleBudgetCheck();
}
