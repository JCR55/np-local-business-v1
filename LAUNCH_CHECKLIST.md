# NP Local Business Launch Checklist

## 1. Check The Domain

The launch files currently use:

`https://www.newportlocalbusiness.co.uk`

If your final domain is different, update it in:

- `data/site.js`
- `robots.txt`
- `sitemap.xml`
- page canonical and Open Graph tags

## 2. Deploy

This site deploys via GitHub → Cloudflare Pages:

1. Push (or merge) to the `main` branch on GitHub.
2. Cloudflare Pages picks up the push automatically and builds/deploys the site.
3. Open the deployment in the Cloudflare Pages dashboard to confirm it succeeded.
4. Open the `*.pages.dev` preview URL to check the live result before it reaches the custom domain.

Redirects and clean URLs (e.g. `/happier-feet`) are handled by the `_redirects` file at the project root, which Cloudflare Pages reads automatically. Cloudflare Pages evaluates `_redirects` rules before serving a matching static file, so a rule can redirect away from a path even when a file of that name still exists on disk (see the `/index.html` and `/happier-feet.html` rules for examples) — no force flag needed (that's Netlify-only syntax and isn't supported here).

## 3. Test The Form

The enquiry form on `/join` submits directly to [Web3Forms](https://web3forms.com) (see the `action` and `access_key` on the form in `join.html`) — it does not depend on the hosting platform, so this works the same on Cloudflare Pages as anywhere else.

1. Open `/join`.
2. Submit a test enquiry.
3. Confirm you land on `/success` (the form's hidden `redirect` field points here).
4. Check the inbox tied to the Web3Forms access key for the notification email.
5. Test a referral link, for example:

`/join?ref=haven-mobility`

6. Confirm the submission includes:

- `referralCode`
- `referralBusiness`

## 4. Connect The Domain

Since DNS already lives on Cloudflare:

1. In the Cloudflare dashboard, open the Pages project.
2. Go to **Custom domains**.
3. Add your domain — Cloudflare can usually provision the DNS record and SSL automatically since the zone is already on Cloudflare.
4. Wait for the custom domain and SSL to show as active.

## 5. Submit To Google

1. Open Google Search Console.
2. Add the live domain.
3. Verify ownership.
4. Submit:

`https://www.newportlocalbusiness.co.uk/sitemap.xml`

5. Request indexing for:

- homepage
- categories page
- locations page
- join page
- several important business profile pages

## 6. After Launch

Priority improvements after the first live version:

- Add analytics.
- Continue improving profile content and images.
- Add a proper CRM/spreadsheet export for form submissions (beyond the Web3Forms inbox).
