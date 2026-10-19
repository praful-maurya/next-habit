import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import { localDateString } from "@/lib/dates";
import { getAuthenticatedAppUser } from "@/lib/auth/app-user";
import { getDashboardSnapshot } from "@/lib/data";

export const instant = false;

export default async function Home() {
  const user = await getAuthenticatedAppUser();
  if (!user) redirect("/login");
  const snapshot = await getDashboardSnapshot(user, localDateString());
  return <AppShell initialSnapshot={snapshot} />;
}
