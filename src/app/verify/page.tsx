import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { VerifyForm } from "@/components/VerifyForm";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") ? next : "/";

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/verify`);
  if (user.emailVerifiedAt) redirect(safeNext);

  const [name, domain] = user.email.split("@");
  const masked = `${name.slice(0, 2)}•••@${domain}`;

  return (
    <div className="max-w-sm mx-auto bg-white rounded-xl border border-stone-200 p-6 mt-6">
      <h1 className="text-xl font-bold">Check your email</h1>
      <p className="mt-2 text-sm text-stone-600">
        We sent a 6-digit code to <strong>{masked}</strong>. Enter it below to activate your
        account — verified accounts are how we keep fake reviews out while keeping you anonymous.
      </p>
      <div className="mt-4">
        <VerifyForm next={safeNext} />
      </div>
    </div>
  );
}
