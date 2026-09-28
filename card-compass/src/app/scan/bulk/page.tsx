import { redirect } from "next/navigation";
import { BulkScan } from "@/components/BulkScan";
import { currentUser } from "@/lib/auth/session";

export const metadata = { title: "Bulk scan — Card Compass" };

export default async function BulkScanPage() {
  if (!(await currentUser())) redirect("/login?next=/scan/bulk");
  return <BulkScan />;
}
