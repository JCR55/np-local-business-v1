# NP Local Business Launch Checklist

## 1. Check The Domain

The launch files currently use:

`https://www.nplocalbusiness.co.uk`

If your final domain is different, update it in:

- `data/site.js`
- `robots.txt`
- `sitemap.xml`
- page canonical and Open Graph tags

## 2. Deploy To Netlify

Simplest first launch:

1. Go to Netlify.
2. Choose **Add new site**.
3. Choose **Deploy manually**.
4. Drag this folder into Netlify:

`outputs/np-local-business-v1`

5. Wait for Netlify to finish deploying.
6. Open the temporary Netlify URL.

## 3. Test The Form

1. Open `/join.html`.
2. Submit a test enquiry.
3. Confirm you land on `/success.html`.
4. In Netlify, open **Forms**.
5. Confirm the enquiry appears under `np-local-business-join`.
6. Test a referral link, for example:

`join.html?ref=haven-mobility`

7. Confirm the submission includes:

- `referralCode`
- `referralBusiness`

## 4. Connect The Domain

1. In Netlify, open the site.
2. Go to **Domain management**.
3. Add your custom domain.
4. Follow Netlify's DNS instructions.
5. Wait for HTTPS/SSL to activate.

## 5. Submit To Google

1. Open Google Search Console.
2. Add the live domain.
3. Verify ownership.
4. Submit:

`https://www.nplocalbusiness.co.uk/sitemap.xml`

5. Request indexing for:

- homepage
- categories page
- locations page
- join page
- several important business profile pages

## 6. After Launch

Priority improvements after the first live version:

- Replace query-string business URLs with cleaner profile URLs.
- Add a proper CRM/spreadsheet export for form submissions.
- Add analytics.
- Continue improving profile content and images.
