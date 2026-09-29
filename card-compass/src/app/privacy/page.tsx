import { LegalPage, legalParties } from "@/components/LegalPage";

export const metadata = { title: "Privacy — Card Compass" };

export default function PrivacyPage() {
  const { operator, contact, draft } = legalParties();
  return (
    <LegalPage title="Privacy" updated="29 September 2026" draft={draft}>
      <p>
        Card Compass is run by {operator}. This page explains what we collect,
        why, and what you can do about it. Questions: {contact}.
      </p>

      <h2>You can use it without an account</h2>
      <p>
        Searching, scanning and checking prices work signed out. We keep no
        profile of signed-out visitors.
      </p>

      <h2>What we store if you create an account</h2>
      <ul>
        <li>
          Your email address and a salted, one-way hash of your password (never
          the password itself).
        </li>
        <li>
          Your country, used to estimate delivered cost and pick a default
          currency.
        </li>
        <li>
          Your collection, binders, wishlist, price alerts, notifications and
          share links, and daily snapshots of your collection&apos;s value.
        </li>
        <li>
          Sign-in sessions (a random token in a cookie) and, if you turn them
          on, push-notification addresses for your devices.
        </li>
      </ul>

      <h2>Card photos</h2>
      <p>
        When you scan a card, the photo is checked, stripped of location and
        camera data, and read in memory. We do not keep the photo. If text
        recognition is switched on, the photo is sent to Google Cloud Vision for
        that one request. We keep only the text read from it (such as the card
        name and number) and which card you picked, with no link to your
        account.
      </p>

      <h2>Services we use</h2>
      <ul>
        <li>
          Hosting and database providers, which store the data above on our
          behalf.
        </li>
        <li>
          Google Cloud Vision, for reading card photos (only when switched on).
        </li>
        <li>
          An email provider, to send confirmation, password-reset and (if you
          ask) alert emails.
        </li>
        <li>
          Apple, Google and your browser&apos;s push service, to deliver
          notifications you turned on.
        </li>
        <li>
          Price and listing sources (Pokémon TCG API, eBay, PriceCharting, PSA,
          European Central Bank). We send them card details and search terms,
          never your email or account.
        </li>
      </ul>
      <p>
        We do not sell your data, show ads or use third-party analytics or
        tracking cookies.
      </p>

      <h2>On your device</h2>
      <p>
        We use a sign-in cookie, and store a few preferences in your browser
        (recently viewed cards, collection view, accent colour). Clearing your
        browser data removes them.
      </p>

      <h2>Sharing</h2>
      <p>
        Share links are off until you create one. Shared pages never show your
        email, purchase prices or grading cert numbers, and you can revoke a
        link at any time.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Export your collection as CSV at any time.</li>
        <li>
          Delete your account in Account settings. This deletes your collection,
          alerts, wishlist, share links and sessions.
        </li>
        <li>
          Ask us about, correct or delete your data by writing to {contact}.
        </li>
      </ul>
    </LegalPage>
  );
}
