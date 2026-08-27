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

  // Every catalogue row must drive a real checkbox. A row whose data-subject
  // has no matching box would look clickable and silently send nothing.
  const rowSubjects = await page.$$eval('button.state[data-subject]',
    els => els.map(e => e.dataset.subject));
  const boxValues = await page.$$eval('#picker input[name=subjects]',
    els => els.map(e => e.value));
  const orphans = rowSubjects.filter(s => !boxValues.includes(s));
  const unlisted = boxValues.filter(v => !rowSubjects.includes(v));

  const wiringProblems = [];
  if (orphans.length) {
    wiringProblems.push(`catalogue row(s) with no matching checkbox: ${orphans.join(', ')}`);
  }
  if (unlisted.length) {
    wiringProblems.push(`checkbox(es) with no catalogue row: ${unlisted.join(', ')}`);
  }
  // Bail before interacting. Clicking a row that does not exist would other-
  // wise fail as a 30s Playwright timeout and a stack trace, burying the
  // actual cause.
  if (wiringProblems.length) {
    console.error('FORM SMOKE TEST FAILED\n' +
      wiringProblems.map((p) => `  - ${p}`).join('\n'));
    process.exitCode = 1;
    await browser.close();
    server.kill();
    process.exit(1);
  }

  // Select two books through the catalogue rows, so the row-to-checkbox
  // wiring is what gets exercised rather than the checkboxes alone. Chosen
  // from the live list so renaming a book does not wedge the test.
  const want = boxValues.filter(v => v !== 'geography').slice(0, 2);
  await page.uncheck('#picker input[value=geography]');
  for (const v of want) {
    await page.click(`button.state[data-subject=${v}]`, { timeout: 5000 });
  }

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
    const sent = captured.body && captured.body.subjects;
    if (!Array.isArray(sent)) {
      problems.push('POST body is missing the subjects array');
    } else if (sent.join() !== want.join()) {
      problems.push(
        `subjects should be ${JSON.stringify(want)} (selected via catalogue rows), ` +
        `got ${JSON.stringify(sent)}`);
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
      `Form smoke test passed: ${rowSubjects.length} catalogue rows all wired to ` +
        'checkboxes, row clicks select the right books, POST carries ' +
        `subjects=[${want.join(',')}] with the email, no JS errors, lands on thanks.html.`
    );
  }
} finally {
  if (browser) await browser.close();
  server.kill();
}

process.exit(exitCode);
