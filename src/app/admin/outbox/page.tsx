import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OutboxPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/");

  const emails = await prisma.emailOutbox.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const smtpConfigured = !!process.env.SMTP_HOST;

  return (
    <div>
      <Link href="/admin" className="text-sm text-brand-700 hover:underline">
        ← Back to moderation
      </Link>
      <h1 className="text-2xl font-bold mt-2">Email outbox</h1>
      <p className="text-sm text-stone-600 mt-1">
        {smtpConfigured
          ? "SMTP is configured — emails are delivered and recorded here."
          : "SMTP is not configured — emails are NOT actually sent, only recorded here. Use this page to find verification codes during development. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM to enable real delivery."}
      </p>
      <div className="mt-4 space-y-2">
        {emails.map((e) => (
          <details key={e.id} className="bg-white rounded-xl border border-stone-200 p-4">
            <summary className="cursor-pointer text-sm">
              <span className="font-medium">{e.subject}</span>
              <span className="text-stone-500"> → {e.to}</span>
              <span className="ml-2 text-xs text-stone-400">
                {e.sentVia} · {e.createdAt.toLocaleString()}
              </span>
            </summary>
            <pre className="mt-2 text-xs text-stone-700 whitespace-pre-wrap bg-stone-50 rounded-lg p-3">
              {e.body}
            </pre>
          </details>
        ))}
        {emails.length === 0 && <p className="text-sm text-stone-500">No emails yet.</p>}
      </div>
    </div>
  );
}
