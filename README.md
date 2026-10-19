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

## Implemented phases

1. **Frontend:** Dashboard, multipage scanner flow, review with all editable line items, searchable invoice history, company-filtered reports, and settings. Safe-area support and native stack navigation. Sample data is marked and isolated from live storage. Sample edits last for the session.
2. **Functionality:** Native document-scanner adapter, page removal and batching, Supabase email/password auth, private page uploads, invoice persistence, client/server arithmetic validation, duplicate invoice protection, and real XLSX generation with summary and line-item sheets. Multiple currencies are reported separately.
3. **Backend:** Three additive migrations deployed to the development project; private storage policies and owner-only invoice policies enabled. Authenticated extraction Edge Function deployed. It validates user identity internally, checks ownership, limits uploads and quotas, validates Claude output, and returns data for mandatory human review.

Claude remains **intentionally unconnected at the user's request**. Set `ANTHROPIC_API_KEY` and an available vision-capable `CLAUDE_MODEL` in Supabase Edge Function secrets when ready. Never put the Anthropic key in an `EXPO_PUBLIC_*` variable. No real invoices have been sent to Anthropic.

## Data and security

- `invoices`: owner UUID, validated JSONB invoice (all line items), private page paths, timestamp. Vendor/number unique per owner. Server checks quantities, line amounts, subtotal and tax/total arithmetic.
- `invoice-pages`: private JPEG storage, maximum 5 MB/page. Signed previews expire after one hour; refresh history to renew.
- `extraction_usage`: server-only quota accounting, 30 attempts/user/day. Maximum 10 pages and 20 MB combined per extraction.
- The Edge Function deliberately uses `verify_jwt = false` at the gateway because it validates the bearer token with `auth.getUser()` itself, including modern signing keys. Missing/invalid tokens are rejected before any provider request.
- iPhone sessions use SecureStore; browser preview sessions use sessionStorage.
- Failed extraction uploads are removed on a best-effort basis. Abandoned successful extraction drafts may leave private orphan images; lifecycle cleanup is still needed before production.
- Credit notes, discounts, complex tax treatments and unusually long invoices require additional workflow support. This version blocks negative amounts and mismatched arithmetic rather than silently correcting them.
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
- `supabase/tests/rls.sql` ran against the development database: owner reads passed, cross-user reads were denied, null vendor data was rejected. All fixtures rolled back.
- Expo Doctor: 18/20 checks passed on this host. The two Git-ignore checks could not verify ignored paths because the native `git` executable is missing. Both `.expo/` and `.env*.local` are explicitly ignored and excluded from publication. Git metadata was initialized with isomorphic-git; repository writes use the GitHub integration.
- `npm audit fix` applied compatible fixes. 27 upstream advisories remain (18 high, 9 moderate), primarily Expo/Metro tooling plus ExcelJS's uuid dependency. The suggested forced fixes downgrade Expo/ExcelJS incompatibly, so they were not applied. Resolve/reassess before production release.

Not verified: real iPhone scanner permissions/cropping/multipage capture, iPhone Excel share sheet, email confirmation and signed-in end-to-end UI, real Claude extraction, native signed build / TestFlight.

## Official guidance

- [Expo skills](https://docs.expo.dev/skills/) and [Expo MCP](https://docs.expo.dev/mcp/)
- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)
- [Supabase Expo quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native)
- [Document scanner](https://github.com/WebsiteBeaver/react-native-document-scanner-plugin)
- [Claude Messages API](https://platform.claude.com/docs/en/api/http/messages)

