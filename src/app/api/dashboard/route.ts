import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/app-user";
import { localDateString } from "@/lib/dates";
import { getDashboardSnapshot } from "@/lib/data";
import { dateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? localDateString();
  const authentication = await authenticateApiRequest();
  if (!authentication.authenticated) return authentication.response;

  const parsedDate = dateSchema.safeParse(date);
  if (!parsedDate.success) {
    return NextResponse.json({ error: "Date must use YYYY-MM-DD format." }, { status: 400 });
  }
  try {
    return NextResponse.json(await getDashboardSnapshot(authentication.user, date));
  } catch (error) {
    console.error("Unable to load the journal dashboard.", error);
    return NextResponse.json(
      { error: "Unable to connect to the journal database. Check DATABASE_URL and run the database migrations." },
      { status: 503 },
    );
  }
}
