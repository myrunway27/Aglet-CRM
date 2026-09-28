import { redirect } from "next/navigation";
import { AlertsView } from "@/components/AlertsView";
import { currentUser } from "@/lib/auth/session";

export const metadata = { title: "Price alerts — Card Compass" };

export default async function AlertsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/alerts");
  return <AlertsView />;
}
