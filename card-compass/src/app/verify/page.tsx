import { VerifyForm } from "@/components/TokenForms";

export const metadata = { title: "Confirm email — Card Compass", referrer: "no-referrer" };

export default async function VerifyPage({ searchParams }: PageProps<"/verify">) {
  const t = (await searchParams).token;
  return <VerifyForm token={typeof t === "string" ? t : ""} />;
}
