# Going live

This is the checklist for turning the demo into the real app. Steps marked **You** need your own accounts, payment details or signature. Everything else is already in the code.

Run `npm run check:live` at any point. It tests every configured service with your real keys and lists what is still in demo mode or missing.

## 1. Accounts and keys (You)

Never paste keys into chats or commit them. Put them in the hosting provider's environment variables (step 2).

| Service | Sign up at | Set these | Cost |
|---|---|---|---|
| Card catalog + TCGplayer/Cardmarket prices | pokemontcg.io (free key) | `CATALOG_PROVIDER=pokemontcg`, `POKEMONTCG_API_KEY` | Free |
| Exchange rates | none needed | `FX_PROVIDER=ecb` | Free |
| Reading card photos | Google Cloud console: create a project, enable **Cloud Vision API**, create an API key restricted to that API | `OCR_PROVIDER=google`, `GOOGLE_CLOUD_VISION_API_KEY` | Free tier, then per image |
| eBay listings | developer.ebay.com: create a production keyset | `OFFERS_PROVIDER=ebay`, `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` | Free |
| eBay account-deletion notices | Same portal, **Alerts & Notifications**: endpoint `https://YOUR-DOMAIN/api/ebay/account-deletion` and the verification token you generate | `EBAY_VERIFICATION_TOKEN` (`openssl rand -hex 24`) | Free |
| Graded + sold prices | pricecharting.com API subscription | `PRICECHARTING_PROVIDER=live`, `PRICECHARTING_TOKEN` | Paid |
| PSA cert lookup | PSA public API | `PSA_PROVIDER=live`, `PSA_API_TOKEN` | Free tier |
| Email | resend.com, and verify your domain there | `MAIL_PROVIDER=resend`, `RESEND_API_KEY`, `MAIL_FROM` | Free tier |

eBay checks the deletion endpoint when you save it, so deploy (step 2) with `EBAY_VERIFICATION_TOKEN` set **before** saving it in the portal. The app stores no eBay user data, so it only acknowledges the notices. Also read the eBay API License Agreement: display, caching and linking rules apply, and consider the eBay Partner Network for affiliate links.

## 2. Hosting (You create the accounts; the config is in the repo)

1. **Database.** Create a Postgres database at Neon or Supabase (both have free plans). Copy the **direct (non-pooled)** connection string into `DATABASE_URL`: migrations need a direct connection.
2. **App.** On vercel.com, import the GitHub repository and set **Root Directory** to `card-compass`. `vercel.json` already runs database migrations on each build and schedules the daily price-alert job. Vercel's free Hobby plan is for non-commercial use; a business needs the Pro plan.
3. **Environment variables** (Vercel → Project → Settings → Environment Variables):
   - `APP_URL=https://your-domain` (used in emailed links)
   - `CRON_SECRET`: `openssl rand -hex 32` (Vercel sends it to the cron job automatically)
   - Web push: run `npx web-push generate-vapid-keys` → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:you@your-domain`
   - `LEGAL_OPERATOR_NAME` (you or your company) and `LEGAL_CONTACT_EMAIL`
   - Every key from step 1
4. **Domain.** Buy one (about $10–15 a year) and add it in Vercel → Domains.
5. Deploy, then run `npm run check:live` locally with the same variables (for example `vercel env pull .env.local`) until every line is ✓ or an intentional –.

## 3. Before you launch (You, with help)

- **Privacy and Terms.** Drafts are at `/privacy` and `/terms`, written from what the app actually stores. Have a lawyer review them. They say "Draft" until `LEGAL_OPERATOR_NAME` and `LEGAL_CONTACT_EMAIL` are set.
- **Import charges.** The EU, UK and Australia rules in `src/lib/landed/` came from public guidance. Have a customs specialist check them.
- **Trademarks.** The app uses "Pokémon" only to describe cards, and states it isn't affiliated. Don't use Pokémon logos, the Poké Ball or official artwork in the app's name, icon or store listing.
- **Real phone test.** Install from the live site on an iPhone and an Android phone: scan with auto-capture, add to collection, get a push alert.

## 4. Phone apps (later, You)

Apple Developer Program ($99 a year, needs a Mac with Xcode) and Google Play Console ($25 once). Build steps are in [MOBILE.md](MOBILE.md).
