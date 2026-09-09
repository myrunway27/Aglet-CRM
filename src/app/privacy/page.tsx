import type { Metadata } from "next";
import { LegalDoc } from "@/components/LegalDoc";

export const metadata: Metadata = { title: "Privacy policy — True Review" };

// Says exactly what the site stores and who sees it. Every claim here maps
// to a real column, cookie or vendor in the code.
export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy policy"
      updated="September 9, 2026"
      intro="Anonymity is the point of True Review, so this policy is short and specific. Here is what we collect, why, who can see it, and how to get rid of it."
    >
      <section>
        <h2>1. What we collect</h2>
        <ul>
          <li><strong>Account:</strong> your email address, a hashed password, whether the email is verified, and the pen name we assign you.</li>
          <li><strong>What you post:</strong> reviews, ratings, quick tags, photos, replies, lists, saved places, flags and disputes, with the time they were made.</li>
          <li><strong>Business owners:</strong> the businesses you claim, claim evidence you send, and a Stripe customer and subscription ID if you buy a membership. Card details go to Stripe; we never see them.</li>
          <li><strong>Location:</strong> only if you tap &ldquo;Near me&rdquo;, and then only to sort results for that page. We don&apos;t store it.</li>
          <li><strong>Technical:</strong> a login cookie, and standard server logs (IP address, browser, pages requested) kept briefly for security.</li>
        </ul>
        <p>We do not run advertising, and we do not sell or share personal data with data brokers.</p>
      </section>
      <section>
        <h2>2. Who sees what</h2>
        <ul>
          <li><strong>Everyone</strong> sees your reviews, photos and replies under your pen name.</li>
          <li><strong>Businesses</strong> see the same thing everyone else sees. They are never given your email, name, or anything that identifies you, including when they reply or dispute a review.</li>
          <li><strong>We</strong> see your email and account activity when moderating, answering support, or investigating abuse.</li>
        </ul>
      </section>
      <section>
        <h2>3. Services we rely on</h2>
        <p>
          Your data is stored with Supabase (database and photo storage, United States). Emails
          such as verification codes go out through our email provider. Payments are handled by Stripe. The
          site runs on Railway. Maps are drawn from OpenFreeMap and OpenStreetMap; when a map loads,
          your browser requests map tiles from those services. Each of these providers processes
          data only to provide its service to us.
        </p>
      </section>
      <section>
        <h2>4. Cookies</h2>
        <p>
          We set one cookie, to keep you logged in. There are no tracking or advertising cookies.
        </p>
      </section>
      <section>
        <h2>5. How long we keep things</h2>
        <p>
          Your account and content stay until you delete them. Deleting a review removes it from the
          site straight away. Deleting your account removes your email and login; reviews are
          removed with it. Server logs are kept for a short period for security and then discarded.
          Payment records are kept as long as tax law requires.
        </p>
      </section>
      <section>
        <h2>6. Your choices and rights</h2>
        <ul>
          <li>Edit or delete any review, reply or photo you posted, at any time.</li>
          <li>Delete your account from the account page.</li>
          <li>Ask us for a copy of your data, or for corrections, by emailing <a href="mailto:thetruereview18@gmail.com">thetruereview18@gmail.com</a>. Residents of California and other states with privacy laws have these rights by statute; we honour them for everyone.</li>
        </ul>
      </section>
      <section>
        <h2>7. Children</h2>
        <p>
          The site is not for children under 16, and we don&apos;t knowingly collect their data. If
          you believe a child has an account, email us and we will remove it.
        </p>
      </section>
      <section>
        <h2>8. Changes</h2>
        <p>
          When this policy changes we update the date at the top and, for material changes, tell
          logged-in users.
        </p>
      </section>
    </LegalDoc>
  );
}
