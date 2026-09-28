import { redirect } from "next/navigation";
import { CollectionView } from "@/components/CollectionView";
import { currentUser } from "@/lib/auth/session";

export const metadata = { title: "My collection — Card Compass" };

export default async function CollectionPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/collection");
  return <CollectionView country={user.country} />;
}
