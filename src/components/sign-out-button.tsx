"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export default function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const signOut = async () => {
    setPending(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message);
      router.replace("/login");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign out. Please try again.");
      setPending(false);
    }
  };

  return (
    <div className="signout-control">
      <button className="secondary-action" disabled={pending} onClick={() => void signOut()} type="button">
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error && <span className="signout-error" role="alert">{error}</span>}
    </div>
  );
}
