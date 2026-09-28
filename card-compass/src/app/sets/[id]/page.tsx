import { notFound, redirect } from "next/navigation";
import { SetDetail } from "@/components/SetDetail";
import { currentUser } from "@/lib/auth/session";
import { SET_ID_RE } from "@/lib/catalog/types";

export default async function SetPage({ params }: PageProps<"/sets/[id]">) {
  const { id } = await params;
  if (!SET_ID_RE.test(id)) notFound();
  if (!(await currentUser())) redirect(`/login?next=/sets/${id}`);
  return <SetDetail setId={id} />;
}
