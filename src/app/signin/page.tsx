import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Log In" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { returnTo } = await searchParams;
  const rt = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  return <AuthForm mode="signin" returnTo={rt} />;
}
