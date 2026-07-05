import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Play Now" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { returnTo } = await searchParams;
  const rt = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  return <AuthForm mode="signup" returnTo={rt} />;
}
