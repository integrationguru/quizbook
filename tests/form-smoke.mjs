#!/usr/bin/env node
// Catches the class of bug that broke the sample form for a full day
// (2026-08-10 03:24 UTC to 2026-08-11): an unrelated edit to the inline
// <script> silently dropped `const FORM_ENDPOINT` and `const form`, the
// submit handler threw on the first line and never attached, and the
// <form> fell back to a native POST-to-self — which GitHub Pages answers
// with 405. Nothing in the browser surfaced that to a visitor; the only
// signal was that submissions stopped arriving.
//
// This loads the real page over a local static server, submits the form
// for real (network calls to FORM_ENDPOINT are intercepted, not sent),
// and fails loudly if the submit path doesn't behave exactly like a
// working form: no JS errors, one POST to the endpoint with an email in
// the body, and a landing on thanks.html.
//
//     node tests/form-smoke.mjs

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = 8931;

const server = spawn('python3', ['-m', 'http.server', String(PORT)], {
  cwd: ROOT,
  stdio: 'ignore',
});
await sleep(600);

let browser;
let exitCode = 0;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
  });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  let captured = null;
  await page.route(
    (url) => url.hostname.endsWith('.run.app'),
    async (route) => {
      captured = {
        method: route.request().method(),
        body: route.request().postDataJSON(),
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    }
  );

  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.fill('#sample-form input[name=name]', 'Smoke Test');
  await page.fill('#sample-form input[type=email]', 'smoke-test@example.com');
  await page.click('#sample-form button[type=submit]');
  await page.waitForURL('**/thanks.html', { timeout: 5000 }).catch(() => {});

  const problems = [];
  if (errors.length) {
    problems.push(`JS error(s) on submit: ${errors.join(' | ')}`);
  }
  if (!captured) {
    problems.push(
      'submit never reached the endpoint — check that FORM_ENDPOINT and ' +
        'form are still declared with const in the inline <script>'
    );
  } else {
    if (captured.method !== 'POST') {
      problems.push(`expected a POST, got ${captured.method}`);
    }
    if (!captured.body || !captured.body.email) {
      problems.push('POST body is missing the email field');
    }
  }
  if (!page.url().endsWith('/thanks.html')) {
    problems.push(`did not land on thanks.html (stuck at ${page.url()})`);
  }

  if (problems.length) {
    console.error('FORM SMOKE TEST FAILED\n' + problems.map((p) => `  - ${p}`).join('\n'));
    exitCode = 1;
  } else {
    console.log(
      'Form smoke test passed: submit reaches FORM_ENDPOINT with a POST ' +
        'carrying the email, no JS errors, lands on thanks.html.'
    );
  }
} finally {
  if (browser) await browser.close();
  server.kill();
}

process.exit(exitCode);
