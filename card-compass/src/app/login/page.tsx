import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { currentUser } from "@/lib/auth/session";

export const metadata = { title: "Sign in — Card Compass" };

const safeNext = (n: unknown) => (typeof n === "string" && /^\/(?!\/)[\w\-/?=&.%]*$/.test(n) ? n : "/collection");

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  if (await currentUser()) redirect(next);
  return <AuthForm next={next} />;
}
