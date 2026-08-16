import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AddBusinessForm } from "@/components/AddBusinessForm";

export default async function AddBusinessPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/add-business");

  return (
    <div>
      <h1 className="text-2xl font-bold text-center mt-4">Add a business</h1>
      <p className="text-center text-stone-600 text-sm mt-1">
        Can&apos;t find the place you want to review? Add it here.
      </p>
      <AddBusinessForm />
    </div>
  );
}
