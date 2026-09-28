import { redirect } from "next/navigation";
import { AccountSettings } from "@/components/AccountSettings";
import { currentUser } from "@/lib/auth/session";
import { mailEnabled } from "@/lib/mail";

export const metadata = { title: "Account — Card Compass" };

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  return (
    <AccountSettings
      email={user.email}
      country={user.country}
      verified={Boolean(user.emailVerifiedAt)}
      emailAlerts={user.emailAlerts}
      mailEnabled={mailEnabled()}
    />
  );
}
