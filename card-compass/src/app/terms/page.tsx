import { LegalPage, legalParties } from "@/components/LegalPage";

export const metadata = { title: "Terms — Card Compass" };

export default function TermsPage() {
  const { operator, contact, draft } = legalParties();
  return (
    <LegalPage title="Terms of use" updated="29 September 2026" draft={draft}>
      <p>
        These terms cover your use of Card Compass, run by {operator}. By using
        it you agree to them. Contact: {contact}.
      </p>

      <h2>Prices are information, not advice</h2>
      <ul>
        <li>
          Reference prices come from third-party sources, are shown in their own
          currency and may be out of date or wrong.
        </li>
        <li>
          Listings are other people&apos;s asking prices, not offers from us. We
          don&apos;t sell cards or take part in any sale.
        </li>
        <li>
          Delivered-cost and import-charge figures are estimates. Your carrier
          or customs authority decides the real amount.
        </li>
        <li>
          Nothing here is financial or investment advice. Check the source
          before you buy or sell.
        </li>
      </ul>

      <h2>Your account</h2>
      <ul>
        <li>
          Keep your password to yourself. You are responsible for what happens
          under your account.
        </li>
        <li>
          Don&apos;t misuse the service: no automated scraping, overloading it,
          or trying to reach other people&apos;s data.
        </li>
        <li>
          We may suspend accounts that break these terms. You can delete your
          account at any time.
        </li>
      </ul>

      <h2>Things you share</h2>
      <p>
        If you create a share link, anyone with the link can see what you chose
        to share until you revoke it.
      </p>

      <h2>No affiliation</h2>
      <p>
        Card Compass is an independent tool. It is not affiliated with, endorsed
        or sponsored by The Pokémon Company, Nintendo, Creatures, GAME FREAK,
        eBay, TCGplayer, Cardmarket, PriceCharting or PSA. Card names and images
        belong to their owners and are shown only to identify cards.
      </p>

      <h2>The service as it is</h2>
      <p>
        We work to keep Card Compass accurate and available, but we provide it
        as it is, without guarantees, and to the extent the law allows we are
        not liable for losses from relying on its prices or estimates. Nothing
        in these terms limits rights you have under the consumer law where you
        live.
      </p>

      <h2>Changes</h2>
      <p>
        If we change these terms in a way that matters, we&apos;ll say so in the
        app before the change takes effect.
      </p>
    </LegalPage>
  );
}
