import { connection } from "next/server";
import AppShell from "@/components/app-shell";
import { emptySnapshot } from "@/lib/types";
import { localDateString } from "@/lib/dates";

export const instant = false;

export default async function Home() {
  await connection();
  return <AppShell initialSnapshot={emptySnapshot(localDateString())} />;
}
