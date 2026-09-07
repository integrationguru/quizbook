# quizbook.org

The public site. Static, served by GitHub Pages from `main` at the repo root.

Nothing operational lives here — no backend code, no keys, no built books.
Those are in the private repo, which holds the question content, the EPUB
builders and the Cloud Functions behind the signup form.

## Layout

| Path | What it is |
|---|---|
| `index.html` | The whole site: markup, styles and script in one file |
| `thanks.html` | Where the form lands after a successful submit |
| `images/` | Everything the pages load |
| `images/characters/` | The per-subject avatars in the catalogue |
| `tests/form-smoke.mjs` | Submits the real form in a real browser (see below) |
| `CNAME` | The custom domain |

### Two images that stay at the repo root

`og-image.png` and `reader-email.png` are **not** in `images/`, and moving
them would break things that this repo cannot fix afterwards:

- `og-image.png` is the social preview. Its URL is baked into every link
  already shared on Slack, WhatsApp, X and LinkedIn, and those platforms
  serve their cached copy until something makes them re-scrape.
- `reader-email.png` is the illustration in the sample email. Every email
  already delivered points at this exact URL. Moving it puts a broken image
  into inboxes going back to launch.

Anything the pages themselves load can move freely; those two cannot.

## Before you push a change to `index.html`

Run the smoke test if you touched the inline `<script>`:

```bash
npm install && npx playwright install chromium && npm run test:form
```

It loads the real page, submits the form with the network call intercepted,
and fails on any JS error, a missing POST, or a failure to land on
`thanks.html`. It exists because an unrelated edit once deleted two lines from
that script and the form silently 405'd for a full day — nothing in the
browser surfaced it, and the only symptom was that submissions stopped
arriving. CI runs it on every push and pull request to `main`.
