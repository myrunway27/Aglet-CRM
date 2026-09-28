import { redirect } from "next/navigation";
import { GradedLookup } from "@/components/GradedLookup";
import { currentUser } from "@/lib/auth/session";

export const metadata = { title: "Add a graded card — Card Compass" };

export default async function GradedPage() {
  if (!(await currentUser())) redirect("/login?next=/graded");
  return <GradedLookup />;
}
