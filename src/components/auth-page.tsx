import { connection } from "next/server";
import { redirect } from "next/navigation";
import AuthExperience from "@/components/auth-experience";
import { auth } from "@/lib/auth/server";
import type { AuthViewPath } from "@neondatabase/auth-ui";

export default async function AuthPage({ path }: { path: AuthViewPath }) {
  await connection();
  const { data: session, error } = await auth.getSession();
  if (error) throw new Error("Unable to verify the current authentication session.", { cause: error });
  if (session?.user && (path === "SIGN_IN" || path === "SIGN_UP")) redirect("/");

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark">D</span>
          <span>
            <strong>The Daily Practice</strong>
            <small>MY DISCIPLINE JOURNAL</small>
          </span>
        </div>
        <p className="auth-intro">A calm space to build habits, nourish yourself, and reflect.</p>
        <AuthExperience path={path} />
        <p className="auth-footnote">Your journal is private to your account.</p>
      </section>
    </main>
  );
}
