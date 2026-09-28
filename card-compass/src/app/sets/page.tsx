import { redirect } from "next/navigation";
import { SetsView } from "@/components/SetsView";
import { currentUser } from "@/lib/auth/session";

export const metadata = { title: "Sets — Card Compass" };

export default async function SetsPage() {
  if (!(await currentUser())) redirect("/login?next=/sets");
  return <SetsView />;
}
