import type { Metadata } from "next";
import { LegalDoc } from "@/components/LegalDoc";

export const metadata: Metadata = { title: "Review guidelines — True Review" };

// The rules readers and owners can hold us to. Every rule here matches what
// the site actually enforces (see src/lib/moderation.ts and the review action).
export default function GuidelinesPage() {
  return (
    <LegalDoc
      title="Review guidelines"
      updated="September 9, 2026"
      intro="True Review exists so people can find out what a place is really like. These guidelines keep the reviews honest, and they apply to everyone: readers, reviewers, and business owners."
    >
      <section>
        <h2>1. Write about your own experience</h2>
        <p>
          A review must describe something that happened to you as a customer, patient, client or
          guest. Don&apos;t review a place you haven&apos;t been to, and don&apos;t review on behalf
          of someone else. Second-hand stories, rumours and things you read elsewhere don&apos;t belong
          in a rating.
        </p>
      </section>
      <section>
        <h2>2. No paid, traded or pressured reviews</h2>
        <p>
          Nobody may offer or accept money, discounts, gifts, free service or anything else in
          exchange for a review, for a particular star rating, or for removing a review. This is
          the rule that matters most, and it is also the law: the U.S. Federal Trade Commission
          bans fake and incentivised reviews. Businesses may invite their customers to review them
          through the invite tool, and those reviews are labelled &ldquo;Invited by the business&rdquo;
          so readers can weigh them. Invites never change a rating.
        </p>
      </section>
      <section>
        <h2>3. Conflicts of interest</h2>
        <p>
          Don&apos;t review a business you own, work for, or compete with, or one owned by family
          or close friends. Don&apos;t rate a competitor to push your own place up.
        </p>
      </section>
      <section>
        <h2>4. Keep it about the business</h2>
        <ul>
          <li>No harassment, threats, slurs or hate directed at anyone.</li>
          <li>No personal details about staff or other customers: full names of non-public people, phone numbers, addresses, health details.</li>
          <li>No accusations of crimes or professional misconduct unless you are describing what happened to you.</li>
          <li>No sexual content, no spam, no links to other sites, no promotional copy.</li>
        </ul>
      </section>
      <section>
        <h2>5. Photos</h2>
        <p>
          Photos must be ones you took at the place, and must not show other customers&apos; faces
          in a way that identifies them, or anything private. Up to three photos per review, under 4
          MB each.
        </p>
      </section>
      <section>
        <h2>6. One review per business, three a day</h2>
        <p>
          Each account may review a business once, and can post at most three reviews in any 24
          hours. You can edit or delete your own review at any time.
        </p>
      </section>
      <section>
        <h2>7. What gets held for a human check</h2>
        <p>
          Some reviews are held before they count towards a rating, and a person looks at them.
          Right now that happens when a brand-new account posts a 1-star or 5-star review, when a
          business gets a burst of low ratings within a few days, or when a review&apos;s wording
          nearly duplicates another recent review. When a business receives far more reviews than
          usual in a short time, its score is frozen while we look. The current counts are published
          on the trust page.
        </p>
      </section>
      <section>
        <h2>8. For business owners</h2>
        <ul>
          <li>You may reply publicly to any review of a business you have claimed. Replies are visible to everyone and follow the same rules as reviews.</li>
          <li>You will never learn who wrote a review. Don&apos;t try to work it out or contact reviewers.</li>
          <li>You may dispute a review you believe breaks these guidelines. A person decides; the outcome is recorded on the trust page.</li>
          <li>Paid memberships buy tools, never ratings. Nothing you pay us affects your score, your rank, or which reviews are shown.</li>
        </ul>
      </section>
      <section>
        <h2>9. What happens when a rule is broken</h2>
        <p>
          Reviews that break these guidelines are hidden. Repeat or serious cases lead to account
          suspension, and claimed businesses caught buying reviews lose their claim. If you see a
          review that breaks the rules, use the flag control on it.
        </p>
      </section>
    </LegalDoc>
  );
}
