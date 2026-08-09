# quizbook.org

Marketing site for QuizBook — question books for Geography, History and Science
Bee competitors.

Static HTML, no build step, served by GitHub Pages.

| Path | What it is |
|---|---|
| `index.html` | The whole site |
| `thanks.html` | Confirmation page shown after a form submission |
| `CNAME` | Custom domain for GitHub Pages |
| `_config.yml` | Keeps this README out of the built site |

## Local preview

```
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Setup checklist

### Enable GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)`.

Once `quizbook.org` resolves, set it as the custom domain and tick **Enforce
HTTPS**. The certificate takes a few minutes to issue after DNS propagates.

### Point the domain

Add these records at the registrar hosting DNS for `quizbook.org`:

| Type | Name | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `integrationguru.github.io` |

The `www` value is the account subdomain, without the repo name.

### Connect the download form

The form posts to a placeholder and will not deliver anything until this is
done. Submitting the page as-is shows an inline notice instead of sending.

1. Create a free account at [formspree.io](https://formspree.io) — 50
   submissions per month on the free tier.
2. Create a form and copy its endpoint ID.
3. Replace both occurrences of `REPLACE_WITH_YOUR_FORM_ID` in `index.html`.

Formspree emails each submission, which is how new signups get noticed.

The form already carries three hidden fields:

- `_subject` — subject line of the notification email
- `_next` — redirects to `/thanks.html` after a successful submission
- `_gotcha` — off-screen honeypot; bots that fill it are discarded silently

### Mail on the domain

Domain registration does not include email. Cloudflare Email Routing forwards
`hello@quizbook.org` to an existing inbox for free.

## Outstanding

The site offers a 150-question Geography sample PDF. That file does not exist
yet and needs to be written before launch.
