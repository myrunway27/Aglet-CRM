import type { Metadata } from "next";
import { LegalDoc } from "@/components/LegalDoc";

export const metadata: Metadata = { title: "Terms of service — True Review" };

// Plain-language terms. Written for people to read, not to hide behind.
export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of service"
      updated="September 9, 2026"
      intro="These terms are the agreement between you and True Review (the “site”, “we”, “us”), operated by [YOUR LEGAL ENTITY NAME]. By creating an account, posting anything, claiming a business or buying a membership, you agree to them."
    >
      <section>
        <h2>1. What True Review is</h2>
        <p>
          True Review is a place for people to publish anonymous reviews of businesses and for
          business owners to reply. We publish what people write; we don&apos;t write reviews, and
          we don&apos;t guarantee that any review is accurate. Reviews are the opinions of their
          authors.
        </p>
      </section>
      <section>
        <h2>2. Your account</h2>
        <ul>
          <li>You must be at least 16 years old.</li>
          <li>One account per person. Don&apos;t share your login or create accounts to review the same business more than once.</li>
          <li>You are responsible for what is posted from your account. Keep your password safe.</li>
          <li>Reviews appear under a pen name we assign. We keep your email address private and never show it to businesses or other users.</li>
        </ul>
      </section>
      <section>
        <h2>3. What you post</h2>
        <p>
          You keep ownership of your reviews, replies and photos. By posting them you give us a
          worldwide, royalty-free licence to show, store, copy and adapt them on the site and in
          things that promote the site, for as long as they are posted. You confirm that what you
          post is yours to post, is true to your experience, and follows our{" "}
          <a href="/guidelines">review guidelines</a>.
        </p>
        <p>
          We may hide, hold or remove any content that breaks the guidelines or the law, and may
          suspend accounts that do. We don&apos;t promise to review everything, and we are not
          responsible for content posted by users.
        </p>
      </section>
      <section>
        <h2>4. Business listings and claims</h2>
        <p>
          Anyone may add a business. Some listings are built from OpenStreetMap data and may be
          incomplete or out of date. Owners may claim their business; we may ask for proof and may
          remove a claim that turns out to be false. Claiming a business does not give you any
          control over its reviews or rating.
        </p>
      </section>
      <section>
        <h2>5. Memberships and payment</h2>
        <p>
          Business memberships are billed by Stripe monthly or annually, renew automatically, and
          can be cancelled at any time from the owner dashboard. Cancelling stops the next charge;
          the current period is not refunded unless the law requires it. Membership buys tools such
          as public replies, review invitations and a spotlight on the listing. It never affects
          ratings, ranking, or which reviews are shown. Prices may change with at least 30
          days&apos; notice.
        </p>
      </section>
      <section>
        <h2>6. Don&apos;t abuse the site</h2>
        <ul>
          <li>No fake, paid or traded reviews, and no offers to buy or remove them.</li>
          <li>No scraping, automated posting, or attempts to identify anonymous reviewers.</li>
          <li>No interfering with the site&apos;s operation or security.</li>
        </ul>
      </section>
      <section>
        <h2>7. Copyright and takedowns</h2>
        <p>
          If you believe content on the site infringes your copyright or is unlawful, email{" "}
          <a href="mailto:thetruereview18@gmail.com">thetruereview18@gmail.com</a> with the link, a
          description of the problem, and your contact details. We respond to valid notices.
        </p>
      </section>
      <section>
        <h2>8. No warranties; limits on liability</h2>
        <p>
          The site is provided as is. We don&apos;t warrant that it will be uninterrupted or
          error-free, or that any review is accurate. To the fullest extent the law allows, we are
          not liable for indirect, incidental or consequential damages, or for anything arising from
          user content or from a business you found through the site. Our total liability for any
          claim is limited to the amount you paid us in the twelve months before the claim.
        </p>
      </section>
      <section>
        <h2>9. Ending an account</h2>
        <p>
          You may delete your account at any time from the account page or by emailing us. We may
          suspend or close accounts that break these terms. Sections 3, 8 and 10 survive.
        </p>
      </section>
      <section>
        <h2>10. Law and changes</h2>
        <p>
          These terms are governed by the laws of the State of [YOUR STATE], United States, and
          disputes are heard in its courts. We may update these terms; when we do, we change the
          date at the top and, for material changes, tell logged-in users. Continuing to use the
          site after a change means you accept it.
        </p>
      </section>
    </LegalDoc>
  );
}
