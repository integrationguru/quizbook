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

### `reader-email.png` is at the root as well as in `images/`

It is the illustration in the sample email, and `backend/main.py` in the
private repo puts its absolute URL into every send. New emails point at
`images/reader-email.png`; the copy at the root is there for the emails
already sitting in people's inboxes, going back to launch, which point at the
old path and always will. Deleting it breaks the picture in all of them.

That is the general rule here: a file the pages load can move freely, but a
URL that has already gone out to the world has to keep answering. `og-image.png`
was the other one — it moved, because a social preview is cached per shared
link and platforms re-read the page's meta tags when they re-scrape, so the
worst case is a stale card that heals rather than a permanent 404. If a
recently shared link still shows the old card, LinkedIn's Post Inspector and
Facebook's Sharing Debugger both force a re-scrape.

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
