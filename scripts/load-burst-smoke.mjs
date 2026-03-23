#!/usr/bin/env node
/* global console, process, setTimeout */

/**
 * Cost-aware manual burst test runner.
 *
 * Defaults stay intentionally small so we can exercise burst handling
 * without accidentally running an expensive or abusive test.
 *
 * Examples:
 *   npm run load:burst
 *   LOAD_TEST_BASE_URL=https://api.example.com LOAD_TEST_PATH=/health npm run load:burst
 *   LOAD_TEST_BASE_URL=http://localhost:3000 LOAD_TEST_PATH=/v1/user/export LOAD_TEST_METHOD=GET LOAD_TEST_JWT=... npm run load:burst
 */

const usage = `
Usage:
  npm run load:burst

Environment variables:
  LOAD_TEST_BASE_URL      Base URL (default: http://localhost:3000)
  LOAD_TEST_PATH          Request path (default: /health)
  LOAD_TEST_METHOD        HTTP method (default: GET)
  LOAD_TEST_CONCURRENCY   Parallel requests per burst (default: 5)
  LOAD_TEST_REQUESTS      Total requests across the whole run (default: 25)
  LOAD_TEST_BURSTS        Number of bursts (default: 3)
  LOAD_TEST_BURST_PAUSE_MS  Pause between bursts (default: 1000)
  LOAD_TEST_JWT           Optional bearer token for authenticated routes
  LOAD_TEST_BODY          Optional JSON string body for POST/PUT/DELETE
`;

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(usage.trim());
  process.exit(0);
}

const config = {
  baseUrl: process.env.LOAD_TEST_BASE_URL || 'http://localhost:3000',
  path: process.env.LOAD_TEST_PATH || '/health',
  method: (process.env.LOAD_TEST_METHOD || 'GET').toUpperCase(),
  concurrency: Number.parseInt(process.env.LOAD_TEST_CONCURRENCY || '5', 10),
  totalRequests: Number.parseInt(process.env.LOAD_TEST_REQUESTS || '25', 10),
  bursts: Number.parseInt(process.env.LOAD_TEST_BURSTS || '3', 10),
  pauseMs: Number.parseInt(process.env.LOAD_TEST_BURST_PAUSE_MS || '1000', 10),
  jwt: process.env.LOAD_TEST_JWT,
  rawBody: process.env.LOAD_TEST_BODY,
};

const requestUrl = new globalThis.URL(config.path, config.baseUrl).toString();
const sharedHeaders = {
  Accept: 'application/json',
  ...(config.jwt ? { Authorization: `Bearer ${config.jwt}` } : {}),
  ...(config.rawBody ? { 'Content-Type': 'application/json' } : {}),
};

const latencies = [];
const statusCounts = new Map();
let networkFailures = 0;

console.log(`Burst test starting against ${requestUrl}`);
console.log(
  JSON.stringify(
    {
      method: config.method,
      concurrency: config.concurrency,
      totalRequests: config.totalRequests,
      bursts: config.bursts,
      pauseMs: config.pauseMs,
    },
    null,
    2,
  ),
);

const requestsPerBurst = Math.ceil(config.totalRequests / config.bursts);

for (let burst = 0; burst < config.bursts; burst += 1) {
  const remainingRequests = config.totalRequests - burst * requestsPerBurst;
  const currentBurstSize = Math.min(requestsPerBurst, Math.max(remainingRequests, 0));

  if (currentBurstSize <= 0) {
    break;
  }

  console.log(`Running burst ${burst + 1}/${config.bursts} with ${currentBurstSize} requests`);
  await runBurst(currentBurstSize);

  if (burst < config.bursts - 1) {
    await sleep(config.pauseMs);
  }
}

const totalCompleted = latencies.length + networkFailures;
const successCount = Array.from(statusCounts.entries())
  .filter(([status]) => status >= 200 && status < 400)
  .reduce((sum, [, count]) => sum + count, 0);
const serverErrorCount = Array.from(statusCounts.entries())
  .filter(([status]) => status >= 500)
  .reduce((sum, [, count]) => sum + count, 0);

console.log('\nSummary');
console.log(`- completed requests: ${totalCompleted}`);
console.log(`- network failures: ${networkFailures}`);
console.log(`- successful responses: ${successCount}`);
console.log(`- server errors: ${serverErrorCount}`);
console.log(`- p50 latency: ${formatMs(percentile(latencies, 50))}`);
console.log(`- p95 latency: ${formatMs(percentile(latencies, 95))}`);
console.log(`- max latency: ${formatMs(latencies.length > 0 ? Math.max(...latencies) : 0)}`);
console.log(
  '- status counts:',
  Object.fromEntries([...statusCounts.entries()].sort(([a], [b]) => a - b)),
);

if (networkFailures > 0 || serverErrorCount > 0) {
  process.exitCode = 1;
}

async function runBurst(totalRequests) {
  let launched = 0;
  const workers = Array.from({ length: Math.min(config.concurrency, totalRequests) }, async () => {
    while (launched < totalRequests) {
      const currentIndex = launched;
      launched += 1;
      await issueRequest(currentIndex);
    }
  });

  await Promise.all(workers);
}

async function issueRequest(sequence) {
  const startedAt = globalThis.performance.now();

  try {
    const response = await globalThis.fetch(requestUrl, {
      method: config.method,
      headers: sharedHeaders,
      body: config.rawBody,
    });
    const duration = globalThis.performance.now() - startedAt;
    latencies.push(duration);
    statusCounts.set(response.status, (statusCounts.get(response.status) || 0) + 1);

    if ((sequence + 1) % 10 === 0) {
      console.log(`  completed ${sequence + 1} requests`);
    }
  } catch {
    networkFailures += 1;
  }
}

function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function formatMs(value) {
  return `${Math.round(value)}ms`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
