import { redirect } from "next/navigation";
import { WishlistView } from "@/components/WishlistView";
import { currentUser } from "@/lib/auth/session";

export const metadata = { title: "Wishlist — Card Compass" };

export default async function WishlistPage() {
  if (!(await currentUser())) redirect("/login?next=/wishlist");
  return <WishlistView />;
}
