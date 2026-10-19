"use client";

import { AuthView, NeonAuthUIProvider } from "@neondatabase/auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import type { AuthViewPath } from "@neondatabase/auth-ui";

export default function AuthExperience({ path }: { path: AuthViewPath }) {
  const router = useRouter();

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      basePath=""
      defaultTheme="light"
      navigate={(href) => router.push(href)}
      replace={(href) => router.replace(href)}
      onSessionChange={() => router.refresh()}
      redirectTo="/"
      Link={Link}
    >
      <AuthView view={path} redirectTo="/" callbackURL="/" />
    </NeonAuthUIProvider>
  );
}
