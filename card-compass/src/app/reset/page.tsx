import { ResetForm } from "@/components/TokenForms";

export const metadata = { title: "Choose a new password — Card Compass", referrer: "no-referrer" };

export default async function ResetPage({ searchParams }: PageProps<"/reset">) {
  const t = (await searchParams).token;
  return <ResetForm token={typeof t === "string" ? t : ""} />;
}
