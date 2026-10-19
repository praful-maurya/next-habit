import { redirect } from "next/navigation";
import ProfileSettings from "@/components/profile-settings";
import { getAuthenticatedAppUser } from "@/lib/auth/app-user";

export const instant = false;

export default async function SettingsPage() {
  const user = await getAuthenticatedAppUser();
  if (!user) redirect("/login");

  return (
    <main className="settings-page">
      <ProfileSettings displayName={user.displayName} email={user.email} />
    </main>
  );
}
