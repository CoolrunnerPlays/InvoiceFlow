# InvoiceFlow

An iPhone invoice scanner built with Expo SDK 58, React Native and TypeScript. The dark navy / blue design follows the supplied dashboard and review reference. Start in sample mode; no account or API key is required to inspect the interface.

## Run

Requires Node 22.13+ (tested with Node 24) and npm.

```sh
npm ci
npm run web
```

For the connected workspace, copy `.env.example` to `.env.local` and set your Supabase project URL and publishable key. These client settings are intentionally separate from server secrets. The configured development project is `yhvfrgqclywucqedlywi` in Canada (`ca-central-1`). Never commit `.env.local`.

```sh
npm start
```

The UI can be previewed in Expo Go, subject to matching SDK support. Document scanning uses a native module absent from Expo Go and needs an iOS development build. Sign into Expo/EAS, configure an EAS project, and provision the iPhone with an Apple development account before running:

```sh
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform ios --profile development
```

**No real iPhone testing has been performed.** An exported iOS JavaScript bundle is not a signed app or a device test.

## Use it on your phone (website)

The app also runs as a website that you can add to the iPhone home screen. You don't need an Apple Developer account or app builds.

1. Copy `.env.example` to `.env.local` and set your Supabase URL and publishable key. They are built into the site, so set them before exporting.
2. Build the site with `npx expo export --platform web`. Re-run this before every deploy.
3. Deploy it to free EAS Hosting:
   - Run `npx eas-cli@latest deploy`. The first time, it asks you to sign in to Expo and choose a subdomain, and it prints a preview URL.
   - Run `npx eas-cli@latest deploy --prod` to publish to the main `https://<name>.expo.app` address.
4. In Supabase → **Authentication → URL Configuration**, set **Site URL** to that address. Otherwise the confirmation emails link to `localhost`.
5. On the iPhone, open the address in **Safari**, tap **Share → Add to Home Screen**, then open InvoiceFlow from its icon.

Differences from the native app:
- **Scanning:** "Take or choose photos" uses the camera or photo library, with no automatic edge cropping. Lay the invoice flat and fill the photo with the page. Every photo is converted to JPEG (including iPhone HEIC photos) and resized to a 2576 px long edge before upload.
- **Sign-in:** the website stays signed in through the browser's local storage. The native app uses the iPhone's secure storage.
- **Excel export:** on a phone it opens the share sheet (Save to Files, Mail, Excel); on a computer it downloads the file.

## Implemented phases

1. **Frontend:** Dashboard, multipage scanner flow, review with all editable line items, searchable invoice history, company-filtered reports, and settings. Safe-area support and native stack navigation. Sample data is marked and isolated from live storage. Sample edits last for the session.
2. **Functionality:** Native document-scanner adapter, page removal and batching, Supabase email/password auth, private page uploads, invoice persistence, client/server arithmetic validation, duplicate invoice protection, and real XLSX generation with summary and line-item sheets. Multiple currencies are reported separately.
3. **Backend:** Three additive migrations deployed to the development project; private storage policies and owner-only invoice policies enabled. Authenticated extraction Edge Function deployed. It validates user identity internally, checks ownership, limits uploads and quotas, validates Claude output, and returns data for mandatory human review.

Claude remains **intentionally unconnected at the user's request**. Set `ANTHROPIC_API_KEY` and an available vision-capable `CLAUDE_MODEL` in Supabase Edge Function secrets when ready. Never put the Anthropic key in an `EXPO_PUBLIC_*` variable. No real invoices have been sent to Anthropic.

## Data and security

- `invoices`: owner UUID, validated JSONB invoice (all line items), private page paths, timestamps and `deleted_at`. Vendor/number unique per owner among non-deleted invoices. The server checks shape and signs: each line is an `item`, `discount` (negative amount) or `return` (negative quantity), and a document is an `invoice` (total ≥ 0) or `credit_note` (total ≤ 0).
- Arithmetic mismatches (qty × price, lines vs subtotal, subtotal + tax vs total) are **review notes**, not blockers. The user must acknowledge them before saving. They are stored permanently with the invoice (`reviewWarnings`, `acknowledgedWarnings`, `warningsReviewedAt`), flagged in history and exported in the workbook's "Review notes" column.
- `invoice-pages`: private JPEG storage, maximum 5 MB/page. Signed previews expire after one hour; refresh history to renew.
- `extraction_usage`: server-only quota accounting, 30 attempts/user/day. Quota is reserved only after the pages pass validation, and released when the provider rejects or never receives the request. A timeout keeps the reservation, because the provider may have processed it. Maximum 10 pages and 20 MB combined per extraction (about 27 MB base64, under the API's 32 MB request limit).
- Scans are resized on the device to the 2576 px long edge Claude reads natively, at JPEG quality 0.9, so text stays legible without wasting upload size.
- The Edge Function deliberately uses `verify_jwt = false` at the gateway because it validates the bearer token with `auth.getUser()` itself, including modern signing keys. Missing/invalid tokens are rejected before any provider request.
- iPhone app sessions use SecureStore; website sessions use localStorage so the home-screen app stays signed in.
- Deleting an invoice is a soft delete. The `purge-pages` Edge Function erases scans of invoices deleted more than 30 days ago, plus uploads older than 24 hours that no invoice references (abandoned reviews, failed saves). It removes files before rows, so failures retry safely. To enable it:
  1. Set a random `PURGE_SECRET` in the Edge Function secrets.
  2. Deploy the function (`supabase functions deploy purge-pages`).
  3. Schedule it daily in **Dashboard → Integrations → Cron**: an HTTP request `POST https://<project>.supabase.co/functions/v1/purge-pages` with the header `x-purge-secret: <secret>`.
- Until the 30-day purge runs, a deleted invoice can be restored by clearing its `deleted_at` in the database. There is no in-app restore yet.
- Complex tax treatments and unusually long invoices still need human judgement. Negative values must be classified as a discount, return or credit note; otherwise they are rejected.
- Production account recovery, account deletion, retention settings, paginated history and operational monitoring are future hardening work.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npx expo export --platform web
npx expo export --platform ios --output-dir dist-ios
```

Verified during implementation:

- TypeScript and ESLint pass.
- Unit tests cover valid invoices, invalid totals/fields and Excel round-trip preservation, including formula-like strings stored as text.
- Web export and iOS Hermes bundle export pass.
- Browser checks: total mismatch disables save; correcting it enables save; sample save returns to history; vendor search filters; company report filtering updates totals; export reports success.
- `supabase/tests/rls.sql` covers owner isolation, soft delete, private quota and purge functions, sign rules and the review audit trail. It runs in CI (the `database` job) against a local Supabase stack.
- Expo Doctor: 18/20 checks passed on this host. The two Git-ignore checks could not verify ignored paths because the native `git` executable is missing. Both `.expo/` and `.env*.local` are explicitly ignored and excluded from publication. Git metadata was initialized with isomorphic-git; repository writes use the GitHub integration.
- `npm audit fix` applied compatible fixes. 27 upstream advisories remain (18 high, 9 moderate), primarily Expo/Metro tooling plus ExcelJS's uuid dependency. The suggested forced fixes downgrade Expo/ExcelJS incompatibly, so they were not applied. Resolve/reassess before production release.

Not verified: real iPhone scanner permissions/cropping/multipage capture, iPhone Excel share sheet, email confirmation and signed-in end-to-end UI, real Claude extraction, native signed build / TestFlight.

## Official guidance

- [Expo skills](https://docs.expo.dev/skills/) and [Expo MCP](https://docs.expo.dev/mcp/)
- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)
- [Supabase Expo quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native)
- [Document scanner](https://github.com/WebsiteBeaver/react-native-document-scanner-plugin)
- [Claude Messages API](https://platform.claude.com/docs/en/api/http/messages)

