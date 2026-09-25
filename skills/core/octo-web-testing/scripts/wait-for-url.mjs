#!/usr/bin/env node
// Waits until a URL answers (any HTTP status < 500), instead of sleeping blindly. Zero dependencies.
// Usage: node wait-for-url.mjs <url> [--timeout 60]
// Exit 0 when ready, 1 on timeout.
const [url] = process.argv.slice(2);
const timeoutIndex = process.argv.indexOf('--timeout');
const timeout = Number(timeoutIndex !== -1 ? process.argv[timeoutIndex + 1] : 60) * 1000;
if (!url) {
  console.error('usage: wait-for-url.mjs <url> [--timeout seconds]');
  process.exit(2);
}

const started = Date.now();
while (Date.now() - started < timeout) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (res.status < 500) {
      console.log(`ready: ${url} → ${res.status} after ${((Date.now() - started) / 1000).toFixed(1)}s`);
      process.exit(0);
    }
  } catch { /* not up yet */ }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
console.error(`timeout: ${url} did not respond within ${timeout / 1000}s`);
process.exit(1);
