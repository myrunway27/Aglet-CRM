# The True Review

Anonymous star reviews for every kind of business — with real safeguards against fake reviews, and a verified reply channel for owners.

**The core promise:** reviewers must have an account (so we can stop spam), but their identity is *never* shown to businesses or other users. Every review is published under a random pen name like "Mellow Heron 23".

## Quick start

```bash
npm install
npm run setup     # creates the SQLite database and seeds demo data
npm run dev       # http://localhost:3000
```

Production: `npm run build && npm start`.

### Seeded accounts

| Account | Password | Role |
| --- | --- | --- |
| `admin@truereview.local` | `admin1234` | Admin (moderation panel at `/admin`) |
| `demo1@truereview.local` … `demo4` | `demo1234` | Regular reviewers |

## How it works

### Anonymity model
- Sign-up requires only email + password. Email is used to log in and to enforce anti-abuse rules — nothing else.
- Reviews display a random pen name generated at posting time. No public page ever shows who wrote a review.
- Only admins can see the account behind a review, and only inside the moderation panel (needed to fight abuse).

### Safeguards against fake / competitor reviews
1. **One review per account per business** (database-enforced).
2. **Rate limit** — max 3 reviews per account per 24 hours.
3. **Heuristic fake detection** on every new review. Reviews still go live instantly, but a hit sends them to the moderation queue, flagged with a reason:
   - extreme rating (1★ or 5★) from an account less than 24 hours old;
   - part of a burst of low ratings on one business within 3 days (pile-on / competitor attack);
   - wording nearly duplicates another recent review of the same business (copy-paste spam).
4. **Report flow** — any user (including the owner) can report a review with a reason; open reports appear in the moderation queue.
5. **Admin decisions** — "keep" clears the flag, "hide" removes the review from public view (soft delete, kept for audit).
6. Owners can't review their own business; minimum review length keeps bare drive-by ratings out.

### Owner replies
- An owner claims their business page and submits verification evidence (business email/phone/website). Evidence is visible only to admins.
- An admin approves the claim → the business gets a "✓ Owner verified" badge and the owner can post one public reply per review (editable) from `/owner`.

### Businesses
- Any signed-in user can add a missing business (name, category, city). Exact duplicates (same name + city) are rejected.

## Tech

- **Next.js 15** (App Router, server actions) + **React 19** + **Tailwind CSS 4**
- **Prisma 6** + **SQLite** — swap `datasource` in `prisma/schema.prisma` + `DATABASE_URL` for Postgres/MySQL in production
- Sessions: httpOnly cookie backed by a DB table; passwords hashed with scrypt
- Review photos are stored in `public/uploads/`

## Project layout

```
prisma/schema.prisma   data model (users, businesses, reviews, claims, reports…)
prisma/seed.ts         demo data + admin account
src/lib/               auth, moderation heuristics, pseudonyms, db client
src/actions/           server actions (auth, business, review, owner, admin)
src/app/               pages: home, business/[slug], claim, account, owner, admin
src/components/        forms and cards
scripts/e2e.mjs        end-to-end browser test (run app on :3100, then `node scripts/e2e.mjs`)
```

## Roadmap ideas

- Email verification / magic links at sign-up
- Photo moderation and image resizing
- Business search by location, categories with subcategories
- Notifications for owners when a new review lands
- Appeals flow for hidden reviews
