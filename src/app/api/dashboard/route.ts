import { NextRequest, NextResponse } from "next/server";
import { localDateString } from "@/lib/dates";
import { getDashboardSnapshot } from "@/lib/data";
import { emptySnapshot } from "@/lib/types";
import { dateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? localDateString();
  const parsedDate = dateSchema.safeParse(date);
  if (!parsedDate.success) {
    return NextResponse.json({ error: "Date must use YYYY-MM-DD format." }, { status: 400 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(emptySnapshot(date));
  }

  try {
    return NextResponse.json(await getDashboardSnapshot(date));
  } catch (error) {
    console.error("Unable to load the journal dashboard.", error);
    return NextResponse.json(
      { error: "Unable to connect to the journal database. Check DATABASE_URL and run the database migrations." },
      { status: 503 },
    );
  }
}
